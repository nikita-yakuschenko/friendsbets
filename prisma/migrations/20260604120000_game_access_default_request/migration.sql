-- Новые турниры по умолчанию «по заявке»
ALTER TABLE "Game" ALTER COLUMN "accessMode" SET DEFAULT 'REQUEST';
