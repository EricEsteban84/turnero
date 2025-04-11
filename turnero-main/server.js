const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const PORT = 3000;

// Ruta al archivo JSON
const archivoPacientes = path.join(__dirname, 'datos', 'pacientes.json');

// Middlewares
app.use(express.json());
app.use(express.static('public'));

// Funciones utilitarias
function leerDatos() {
    return JSON.parse(fs.readFileSync(archivoPacientes, 'utf-8'));
}

function guardarDatos(data) {
    try {
        fs.writeFileSync(archivoPacientes, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error guardando datos:", error);
    }
}

// ======================== RUTAS API ============================ //

// Obtener todos los pacientes
app.get('/api/pacientes', (req, res) => {
    const data = leerDatos();
    res.json(data);
});

// Agregar un nuevo paciente
app.post('/api/pacientes', (req, res) => {
    const data = leerDatos();
    const nuevo = req.body;

    const soloLetrasRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
    if (!nuevo.nombre || !soloLetrasRegex.test(nuevo.nombre)) {
        return res.status(400).json({ mensaje: "El nombre solo puede contener letras y espacios." });
    }

    const existe = data.usuarios.some(u => u.nombre === nuevo.nombre && u.servicio === nuevo.servicio);
    if (existe) {
        return res.status(400).json({ mensaje: "Paciente ya registrado." });
    }

    data.usuarios.push(nuevo);
    guardarDatos(data);
    res.json({ mensaje: "Paciente agregado." });
});

// Llamar a un paciente (agregar al turnero)
app.post('/api/llamar', (req, res) => {
    const data = leerDatos();
    const llamado = req.body;

    // Verificamos si el paciente ya fue llamado antes (con nombre y servicio, ignorando número opcional)
    const yaLlamado = data.pacientesLlamados.some(p =>
        p.nombre === llamado.nombre &&
        p.servicio === llamado.servicio
    );

    if (!yaLlamado) {
        data.pacientesLlamados.unshift(llamado); // Agrega al principio
        if (data.pacientesLlamados.length > 100) {
            data.pacientesLlamados.pop(); // Mantener máximo 100
        }
    }

    guardarDatos(data);
    res.json({ mensaje: yaLlamado ? "Paciente ya fue llamado." : "Paciente llamado con éxito." });
});

// Eliminar paciente o cambiar servicio si fue llamado desde Recepción
app.delete('/api/pacientes', (req, res) => {
    const data = leerDatos();
    const { nombre, servicio } = req.body;

    // Buscar si fue llamado con ese servicio
    const fueLlamado = data.pacientesLlamados.some(p => p.nombre === nombre && p.servicio === servicio);

    if (fueLlamado && servicio === "Recepción") {
        // Cambiar de "Recepción" a "Caja"
        const paciente = data.usuarios.find(u => u.nombre === nombre && u.servicio === "Recepción");
        if (paciente) paciente.servicio = "Caja";

        // Eliminar del turnero
        data.pacientesLlamados = data.pacientesLlamados.filter(p => !(p.nombre === nombre && p.servicio === "Recepción"));

        guardarDatos(data);
        return res.json({ mensaje: "Paciente cambiado a Caja y eliminado del turnero." });
    }

    // En cualquier otro caso, eliminar completamente
    data.usuarios = data.usuarios.filter(u => !(u.nombre === nombre && u.servicio === servicio));
    data.pacientesLlamados = data.pacientesLlamados.filter(p => !(p.nombre === nombre && p.servicio === servicio));

    guardarDatos(data);
    res.json({ mensaje: "Paciente eliminado completamente." });
});

// Cambiar servicio manualmente (opcional)
app.put('/api/pacientes/cambiar-servicio', (req, res) => {
    const { nombre, nuevoServicio } = req.body;
    const data = leerDatos();

    const paciente = data.usuarios.find(p => p.nombre === nombre);
    if (paciente) {
        paciente.servicio = nuevoServicio;

        const llamado = data.pacientesLlamados.find(p => p.nombre === nombre);
        if (llamado) llamado.servicio = nuevoServicio;

        guardarDatos(data);
        return res.json({ mensaje: 'Servicio actualizado correctamente' });
    }

    res.status(404).json({ mensaje: 'Paciente no encontrado' });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});