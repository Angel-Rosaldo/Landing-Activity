-- Crear tabla para almacenar contactos
CREATE TABLE IF NOT EXISTS public.contactos (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    mensaje TEXT NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_contactos_correo ON public.contactos(correo);
CREATE INDEX IF NOT EXISTS idx_contactos_fecha ON public.contactos(fecha_creacion DESC);

-- Agregar comentarios a la tabla
COMMENT ON TABLE public.contactos IS 'Tabla para almacenar información de contactos del formulario web';
COMMENT ON COLUMN public.contactos.id IS 'Identificador único del contacto';
COMMENT ON COLUMN public.contactos.nombre IS 'Nombre completo del contacto';
COMMENT ON COLUMN public.contactos.correo IS 'Correo electrónico del contacto';
COMMENT ON COLUMN public.contactos.telefono IS 'Número de teléfono del contacto';
COMMENT ON COLUMN public.contactos.mensaje IS 'Mensaje enviado por el contacto';
COMMENT ON COLUMN public.contactos.fecha_creacion IS 'Fecha y hora de creación del registro';

-- Habilitar Row Level Security (RLS) para mayor seguridad
ALTER TABLE public.contactos ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir inserción de nuevos contactos
CREATE POLICY "Permitir inserción de contactos" ON public.contactos
    FOR INSERT WITH CHECK (true);

-- Crear política para permitir lectura de contactos (opcional, para administración)
CREATE POLICY "Permitir lectura de contactos" ON public.contactos
    FOR SELECT USING (true);

-- Otorgar permisos necesarios
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.contactos TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;