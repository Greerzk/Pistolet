-- =====================================================================
--  PISTOLET · Migración: foto de perfil (Cloudinary)
--
--  Ejecuta este archivo UNA vez en el SQL Editor de Neon si tu base ya
--  existía antes de esta función (instalaciones nuevas: usa schema.sql y
--  no lo necesitas).
--
--  Guarda en la tabla únicamente la URL de la imagen y su public_id de
--  Cloudinary; el archivo como tal vive en Cloudinary, no en la base.
-- =====================================================================
BEGIN;

ALTER TABLE usuario ADD COLUMN IF NOT EXISTS avatar_url       text;
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS avatar_public_id text;

COMMIT;
