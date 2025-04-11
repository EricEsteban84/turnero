// ✅ Guardar nuevo paciente
async function guardarNombre() {
    const nombreInput = document.getElementById('nombre');
    const nombre = nombreInput.value.trim();
    const servicio = document.getElementById('opciones').value;

    const soloLetrasRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;

    if (!nombre) {
        alert("Por favor, ingresa un nombre.");
        return;
    }

    if (!soloLetrasRegex.test(nombre)) {
        alert("El nombre solo puede contener letras y espacios (sin números ni símbolos).");
        nombreInput.focus();
        return;
    }

    const nuevoUsuario = { nombre, servicio };

    try {
        const response = await fetch('/api/pacientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoUsuario)
        });

        if (!response.ok) {
            const data = await response.json();
            alert(data.mensaje || "Error al registrar.");
            return;
        }

        alert("Paciente registrado con éxito.");
        nombreInput.value = '';
        mostrarUsuarios();
    } catch (error) {
        console.error("Error al guardar paciente:", error);
    }
}

// ✅ Actualiza la URL con el filtro y refresca la lista
function actualizarFiltroURL() {
    const filtro = document.getElementById('filtro')?.value || 'Todos';
    const nuevaURL = new URL(window.location.href);
    nuevaURL.searchParams.set('filtro', filtro);
    history.replaceState(null, '', nuevaURL.toString());
    mostrarUsuarios();
}

// ✅ Obtiene el filtro actual desde la URL
function obtenerFiltroDesdeURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('filtro') || 'Todos';
}

// ✅ Mostrar lista de pacientes según filtro
async function mostrarUsuarios() {
    try {
        const response = await fetch('/api/pacientes');
        const data = await response.json();

        const listaUsuarios = document.getElementById('lista-usuarios');
        if (!listaUsuarios) return;

        const filtro = obtenerFiltroDesdeURL();
        const filtroSelect = document.getElementById('filtro');
        if (filtroSelect) filtroSelect.value = filtro;

        listaUsuarios.innerHTML = '';
        let usuariosFiltrados = data.usuarios;

        if (filtro === 'Caja 1' || filtro === 'Caja 2') {
            usuariosFiltrados = usuariosFiltrados.filter(u => u.servicio === 'Caja');
        } else if (filtro === 'Recepción') {
            usuariosFiltrados = usuariosFiltrados.filter(u => u.servicio === 'Recepción');
        }

        // Leer pacientes ya llamados desde localStorage
        const llamados = JSON.parse(localStorage.getItem('pacientesLlamados')) || [];

        usuariosFiltrados.forEach(usuario => {
            const usuarioDiv = document.createElement('div');
            usuarioDiv.classList.add('usuario');

            const mostrarBotones = filtro !== 'Todos';
            const idPaciente = usuario.nombre + '_' + usuario.servicio;
            if (llamados.includes(idPaciente)) {
                usuarioDiv.classList.add('usuario-llamado');
            }
            if (mostrarBotones) {
                // Crear botón Llamar
                const btnLlamar = document.createElement('button');
                btnLlamar.classList.add('btn-llamar');

                // Verificar si ya fue llamado antes
                const yaLlamado = llamados.includes(idPaciente);
                btnLlamar.textContent = yaLlamado ? 'Segundo llamado' : 'Llamar';

                btnLlamar.addEventListener('click', () => {
                    reproducirAlerta();
                    const filtroActual = obtenerFiltroDesdeURL();
                    
                    // Usar el filtro como módulo solo si es Caja 1 o Caja 2
                    const modulo = (filtroActual === 'Caja 1' || filtroActual === 'Caja 2') ? filtroActual : usuario.servicio;
                
                    llamarPaciente(usuario.nombre, modulo);
                
                    if (!llamados.includes(idPaciente)) {
                        // Primer llamado
                        llamados.push(idPaciente);
                        localStorage.setItem('pacientesLlamados', JSON.stringify(llamados));
                
                        btnLlamar.textContent = 'Segundo llamado';
                        btnLlamar.classList.add('llamado-doble');
                        usuarioDiv.classList.add('usuario-llamado');
                    } else {
                        // Segundo llamado - se elimina el botón de llamar
                        btnLlamar.remove(); // o usa btnLlamar.disabled = true si prefieres ocultar funcionalidad pero no visualmente
                    }
                });
                
        const btnEliminar = document.createElement('button');
                btnEliminar.textContent = 'Eliminar';
                btnEliminar.onclick = () => eliminarPacientePorNombre(usuario.nombre, usuario.servicio);

                usuarioDiv.innerHTML = `
                    <p><strong>${usuario.nombre}</strong></p>
                    <p><strong>Servicio:</strong> ${usuario.servicio}</p>
                `;

                usuarioDiv.appendChild(btnLlamar);
                usuarioDiv.appendChild(btnEliminar);
            } else {
                usuarioDiv.innerHTML = `
                    <p><strong>${usuario.nombre}</strong></p>
                    <p><strong>Servicio:</strong> ${usuario.servicio}</p>
                `;
            }

            listaUsuarios.appendChild(usuarioDiv);
        });

    } catch (error) {
        console.error("Error al mostrar usuarios:", error);
    }
}  
// ✅ Reproducir sonido de alerta
function reproducirAlerta() {
    const audio = new Audio("sonido/alerta.mp3");
    audio.play();
}

// ✅ Llamar paciente (con número opcional)
async function llamarPaciente(nombre, servicio, numero) {
    const paciente = { nombre, servicio, numero };

    try {
        const response = await fetch('/api/llamar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paciente)
        });

        const data = await response.json();

        if (response.ok) {
            reproducirAlerta();
            alert(`Paciente ${nombre} llamado para el módulo ${servicio}`);
        } else {
            alert(data.mensaje || "Error al llamar paciente.");
        }

        mostrarPacientesLlamados();
    } catch (error) {
        console.error("Error al llamar paciente:", error);
    }
}

// ✅ Eliminar paciente o cambiar su servicio si fue llamado desde Caja
async function eliminarPacientePorNombre(nombre, servicio) {
    try {
        const response = await fetch('/api/pacientes', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, servicio })
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.mensaje || "Paciente eliminado o cambiado.");
        } else {
            alert(data.mensaje || "Error al eliminar o cambiar.");
        }

        mostrarUsuarios();
        mostrarPacientesLlamados();
    } catch (error) {
        console.error("Error al eliminar o cambiar paciente:", error);
    }
}
// ✅ Mostrar pacientes llamados en el turnero
async function mostrarPacientesLlamados() {
    try {
        const response = await fetch('/api/pacientes');
        const data = await response.json();

        const contenedor = document.getElementById('pacientes-llamados');
        if (!contenedor) return;

        contenedor.innerHTML = '';
        const primeros = data.pacientesLlamados.slice(0, 7);

        primeros.forEach(paciente => {
            const numero = paciente.numero || '?';
            const div = document.createElement('div');
            div.classList.add('paciente');
            div.innerHTML = `
                <div class="columna">${paciente.nombre}</div>
                <div class="columna">${paciente.servicio}</div>
            `;
            contenedor.appendChild(div);
        });
    } catch (error) {
        console.error("Error al mostrar pacientes llamados:", error);
    }
}

// ✅ Eventos al cargar la página
window.onload = () => {
    if (document.getElementById('lista-usuarios')) {
        mostrarUsuarios();
    }
    if (document.getElementById('pacientes-llamados')) {
        mostrarPacientesLlamados();
        setInterval(mostrarPacientesLlamados, 5000); // Actualiza cada 5 segundos
    }
};