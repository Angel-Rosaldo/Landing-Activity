const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuración de reCAPTCHA
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Función para verificar reCAPTCHA
const verifyRecaptcha = async (token) => {
    try {
        const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
            params: {
                secret: RECAPTCHA_SECRET_KEY,
                response: token
            }
        });
        return response.data.success;
    } catch (error) {
        console.error('Error verificando reCAPTCHA:', error);
        return false;
    }
};

// Validación de datos del formulario
const validateContactData = (data) => {
    const errors = [];

    if (!data.nombre || data.nombre.trim().length < 2) {
        errors.push('El nombre debe tener al menos 2 caracteres');
    }

    if (!data.correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo)) {
        errors.push('El correo electrónico no es válido');
    }

    if (!data.telefono || !/^[\d\s\-\+\(\)]{10,}$/.test(data.telefono.replace(/\s/g, ''))) {
        errors.push('El teléfono debe tener al menos 10 dígitos');
    }

    if (!data.mensaje || data.mensaje.trim().length < 10) {
        errors.push('El mensaje debe tener al menos 10 caracteres');
    }

    return errors;
};

// Rutas

app.get('/', (req, res) => {
    res.json({
        message: 'API CodeAcademy Pro funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

app.post('/api/contacto', async (req, res) => {
    try {
        const { nombre, correo, telefono, mensaje, recaptcha, terminos } = req.body;

        console.log('📩 Datos recibidos del cliente:', { nombre, correo, telefono, mensaje });
        console.log('🛡️ Token reCAPTCHA recibido:', recaptcha);

        if (!terminos) {
            return res.status(400).json({
                error: 'Debes aceptar los términos y condiciones'
            });
        }

        if (!recaptcha) {
            return res.status(400).json({
                error: 'reCAPTCHA es requerido'
            });
        }

        const isRecaptchaValid = await verifyRecaptcha(recaptcha);
        if (!isRecaptchaValid) {
            return res.status(400).json({
                error: 'reCAPTCHA inválido. Por favor, inténtalo de nuevo.'
            });
        }

        const errors = validateContactData({ nombre, correo, telefono, mensaje });
        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Datos inválidos',
                details: errors
            });
        }

        const { data, error } = await supabase
            .from('contactos')
            .insert([
                {
                    nombre: nombre.trim(),
                    correo: correo.trim().toLowerCase(),
                    telefono: telefono.trim(),
                    mensaje: mensaje.trim(),
                    terminos: true,
                    fecha_creacion: new Date().toISOString()
                }
            ])
            .select();

        if (error) {
            console.error('Error de Supabase:', error);
            return res.status(500).json({
                error: 'Error al guardar en la base de datos',
                details: error.message
            });
        }

        console.log('Contacto creado exitosamente:', data[0].id);

        // Enviar datos al webhook de Make
        try {
            const webhookUrl = process.env.MAKE_WEBHOOK_URL;
            await axios.post(webhookUrl, {
                id: data[0].id,
                nombre: nombre.trim(),
                correo: correo.trim().toLowerCase(),
                telefono: telefono.trim(),
                mensaje: mensaje.trim(),
                terminos: true,
                fecha_creacion: new Date().toISOString()
            });
            console.log('✅ Datos enviados al webhook de Make');
        } catch (webhookError) {
            console.error('❌ Error al enviar datos al webhook de Make:', webhookError.message);
        }

        res.status(201).json({
            message: 'Contacto guardado exitosamente',
            id: data[0].id
        });

    } catch (error) {
        console.error('Error en /api/contacto:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

app.get('/api/contactos', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('contactos')
            .select('*')
            .order('fecha_creacion', { ascending: false });

        if (error) {
            console.error('Error al obtener contactos:', error);
            return res.status(500).json({
                error: 'Error al obtener contactos',
                details: error.message
            });
        }

        res.json({
            contactos: data,
            total: data.length
        });

    } catch (error) {
        console.error('Error en /api/contactos:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

app.get('/api/contacto/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('contactos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    error: 'Contacto no encontrado'
                });
            }
            console.error('Error al obtener contacto:', error);
            return res.status(500).json({
                error: 'Error al obtener contacto',
                details: error.message
            });
        }

        res.json(data);

    } catch (error) {
        console.error('Error en /api/contacto/:id:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

app.use((req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        path: req.path
    });
});

app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    res.status(500).json({
        error: 'Error interno del servidor',
        details: error.message
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    console.log(`📝 Endpoint principal: http://localhost:${PORT}/api/contacto`);
    console.log(`📊 Ver contactos: http://localhost:${PORT}/api/contactos`);
});

module.exports = app;