-- 응모해 - PostgreSQL 17 DDL
-- docs/8-erd.md, docs/1-domain-definition.md §3/§4/§7 기준
-- v1.0 2026-08-13 최초 작성

CREATE TABLE users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    login_id       VARCHAR(100) NOT NULL UNIQUE,
    password       VARCHAR(255) NOT NULL,
    business_name  VARCHAR(200) NOT NULL,
    name           VARCHAR(100) NOT NULL,
    phone          VARCHAR(30),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admins (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    login_id    VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    name        VARCHAR(100) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE promotions (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title                    VARCHAR(200) NOT NULL,
    type                     VARCHAR(20) NOT NULL CHECK (type IN ('DIRECT', 'ROULETTE')),
    description              TEXT NOT NULL,
    start_at                 TIMESTAMPTZ NOT NULL,
    end_at                   TIMESTAMPTZ NOT NULL,
    status                   VARCHAR(20) NOT NULL CHECK (status IN ('UPCOMING', 'ONGOING', 'ENDED')),
    max_participation_count  INT NOT NULL DEFAULT 1,
    created_by               UUID NOT NULL REFERENCES admins(id),
    CHECK (end_at > start_at)
);

CREATE INDEX idx_promotions_created_by ON promotions(created_by);
CREATE INDEX idx_promotions_status ON promotions(status);

-- (user_id, promotion_id) 유일성: 참여신청 유일성 규칙(도메인 정의서 규칙3) 강제
CREATE TABLE participations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id),
    promotion_id     UUID NOT NULL REFERENCES promotions(id),
    status           VARCHAR(20) NOT NULL CHECK (status IN ('APPLIED', 'CANCELLED', 'REAPPLIED')),
    participated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    attempt_count    INT NOT NULL DEFAULT 0, -- 참여 생성 INSERT 시 애플리케이션이 명시값을 채운다(DIRECT=1 고정, ROULETTE는 0으로 생성 후 시도마다 UPDATE로 1씩 증가)
    result           VARCHAR(20) CHECK (result IS NULL OR result = 'PENDING'),
    UNIQUE (user_id, promotion_id)
);

CREATE INDEX idx_participations_promotion_id ON participations(promotion_id);

CREATE TABLE participation_attempts (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participation_id  UUID NOT NULL REFERENCES participations(id),
    attempt_no        INT NOT NULL,
    result            VARCHAR(10) NOT NULL CHECK (result IN ('WIN', 'LOSE')),
    attempted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (participation_id, attempt_no)
);

-- 재추첨 불가(규칙4): 생성된 시도 결과는 수정·삭제되지 않는 append-only 테이블로 DB 레벨에서 강제
CREATE FUNCTION forbid_participation_attempt_mutation() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'participation_attempts is append-only: % not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_participation_attempts_no_mutation
    BEFORE UPDATE OR DELETE ON participation_attempts
    FOR EACH ROW EXECUTE FUNCTION forbid_participation_attempt_mutation();
