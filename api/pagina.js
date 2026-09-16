const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = async (req, res) => {
  const idPartido = (req.query.id || '').toString().trim();

  let titulo = 'Carga de asistencia';
  let descripcion = 'Formulario de carga de asistencia socios.';

  if (idPartido) {
    try {
      const { data } = await supabase
        .from('partidos')
        .select('nombre')
        .eq('id_partido', idPartido)
        .maybeSingle();

      if (data && data.nombre) {
        titulo = data.nombre;
        descripcion = `Anotate para el partido: ${data.nombre}`;
      }
    } catch (err) {
      // si falla la consulta, seguimos con el título genérico
    }
  }

  const tituloSeguro = escaparHtml(titulo);
  const descripcionSegura = escaparHtml(descripcion);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${tituloSeguro}</title>

<meta property="og:title" content="${tituloSeguro}">
<meta property="og:description" content="${descripcionSegura}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${tituloSeguro}">
<meta name="twitter:description" content="${descripcionSegura}">

<style>
  * { box-sizing: border-box; }
  body {
    font-family: Arial, sans-serif;
    max-width: 480px;
    margin: 20px auto;
    background-color: #f5f5f5;
    color: #0a2856;
    padding: 0 16px;
  }
  h2 {
    background-color: #0a2856;
    color: #ffd200;
    text-align: center;
    padding: 14px 10px;
    border-radius: 6px;
    border: 3px solid #ffd200;
    font-size: 20px;
  }
  #cierraAviso {
    text-align: center;
    font-size: 14px;
    margin-top: 8px;
    color: #0a2856;
  }
  label { font-weight: bold; display: block; margin-top: 14px; font-size: 15px; }
  input, select {
    width: 100%;
    padding: 12px;
    border: 2px solid #0a2856;
    border-radius: 4px;
    font-size: 16px;
  }
  button {
    display: block;
    width: 100%;
    margin-top: 14px;
    padding: 14px 20px;
    background-color: #ffd200;
    color: #0a2856;
    font-weight: bold;
    font-size: 16px;
    border: 2px solid #0a2856;
    border-radius: 4px;
    cursor: pointer;
  }
  button:active { background-color: #0a2856; color: #ffd200; }
  #numeroConfirmado {
    font-size: 22px;
    font-weight: bold;
    margin: 16px 0;
    background-color: #fff6cc;
    border: 2px dashed #ffd200;
    padding: 10px;
    text-align: center;
    border-radius: 4px;
    word-break: break-all;
  }
  #mensaje { font-weight: bold; margin-top: 12px; min-height: 20px; }
  #estadoInicial { text-align: center; margin-top: 40px; font-size: 17px; }
  .oculto { display: none; }

  .modal-overlay {
    display: none;
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(10, 40, 86, 0.65);
    z-index: 1000;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .modal-overlay.visible { display: flex; }
  .modal-box {
    background: #fff;
    border: 3px solid #0a2856;
    border-radius: 8px;
    padding: 24px 20px;
    max-width: 340px;
    width: 100%;
    text-align: center;
  }
  .modal-box p {
    font-weight: bold;
    font-size: 16px;
    margin: 0 0 16px;
    color: #0a2856;
  }
  .modal-box button { margin-top: 0; }
</style>
</head>
<body>

  <div id="estadoInicial">Cargando información del partido...</div>

  <div id="contenido" class="oculto">
    <h2 id="tituloPartido"></h2>
    <p id="cierraAviso" class="oculto"></p>

    <div id="formulario">
      <label>Nº de socio/a (sin puntos)</label>
      <input type="text" id="numeroSocio" inputmode="numeric" oninput="limpiarSoloNumeros(this)">

      <label>Categoría de socio/a</label>
      <input type="text" id="categoria" oninput="limpiarSoloLetras(this)">

      <label>DNI (sin puntos)</label>
      <input type="text" id="dni" inputmode="numeric" oninput="limpiarSoloNumeros(this)">

      <label>Nombre y apellido</label>
      <input type="text" id="nombreApellido" oninput="limpiarSoloLetras(this)">

      <label>Localidad</label>
      <input type="text" id="localidad" oninput="limpiarSoloLetras(this)">

      <label>Referente</label>
      <input type="text" value="MARCELO FERNANDEZ" disabled>

      <label>Cumple filtro de asistencia</label>
      <select id="cumpleFiltro">
        <option value="SI">SI</option>
        <option value="NO">NO</option>
      </select>

      <button onclick="mostrarConfirmacion()">Continuar</button>
    </div>

    <div id="confirmacion" class="oculto">
      <p>Revisá que tu número de socio esté bien escrito antes de confirmar:</p>
      <p id="numeroConfirmado"></p>
      <button onclick="enviar()">Confirmar y enviar</button>
      <button onclick="volver()" style="background-color:#f5f5f5;">Volver a editar</button>
    </div>

    <p id="mensaje"></p>
  </div>

  <div id="modalMensaje" class="modal-overlay">
    <div class="modal-box">
      <p id="modalTexto"></p>
      <button onclick="cerrarModal()">Entendido</button>
    </div>
  </div>

<script>
  const idPartido = window.location.pathname.replace(/^\\/+|\\/+$/g, '');

  function limpiarSoloNumeros(el) {
    el.value = el.value.replace(/[^0-9]/g, '');
  }

  function limpiarSoloLetras(el) {
    el.value = el.value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\\s'-]/g, '');
  }

  function mostrarModal(texto) {
    document.getElementById('modalTexto').innerText = texto;
    document.getElementById('modalMensaje').classList.add('visible');
  }

  function cerrarModal() {
    document.getElementById('modalMensaje').classList.remove('visible');
  }

  function mostrarEstadoInicial(texto) {
    document.getElementById('estadoInicial').innerText = texto;
  }

  async function cargarPartido() {
    if (!idPartido) {
      mostrarEstadoInicial('Falta indicar el partido en la URL.');
      return;
    }

    try {
      const resp = await fetch(\`/api/config?id=\${encodeURIComponent(idPartido)}\`);
      const info = await resp.json();

      if (!info.existe) {
        mostrarEstadoInicial('No encontramos ese partido. Revisá el link.');
        return;
      }

      if (info.estado !== 'abierto') {
        mostrarEstadoInicial(\`La carga de asistencia para "\${info.nombre}" está cerrada.\`);
        return;
      }

      document.getElementById('estadoInicial').classList.add('oculto');
      document.getElementById('contenido').classList.remove('oculto');
      document.getElementById('tituloPartido').innerText = info.nombre;

      if (info.cierra_en) {
        const hora = new Date(info.cierra_en).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        const aviso = document.getElementById('cierraAviso');
        aviso.innerText = \`Formulario disponible hasta las \${hora} hs\`;
        aviso.classList.remove('oculto');
      }
    } catch (err) {
      mostrarEstadoInicial('No se pudo conectar. Probá de nuevo en unos minutos.');
    }
  }

  function mostrarConfirmacion() {
    const numero = document.getElementById('numeroSocio').value.trim();
    if (!numero) {
      mostrarModal('Ingresá tu número de socio antes de continuar.');
      return;
    }
    document.getElementById('numeroConfirmado').innerText = numero;
    document.getElementById('formulario').classList.add('oculto');
    document.getElementById('confirmacion').classList.remove('oculto');
  }

  function volver() {
    document.getElementById('confirmacion').classList.add('oculto');
    document.getElementById('formulario').classList.remove('oculto');
  }

  async function enviar() {
    const datos = {
      idPartido: idPartido,
      numeroSocio: document.getElementById('numeroSocio').value,
      categoria: document.getElementById('categoria').value,
      dni: document.getElementById('dni').value,
      nombreApellido: document.getElementById('nombreApellido').value,
      localidad: document.getElementById('localidad').value,
      cumpleFiltro: document.getElementById('cumpleFiltro').value
    };

    document.getElementById('confirmacion').classList.add('oculto');
    document.getElementById('mensaje').innerText = 'Verificando...';

    try {
      const resp = await fetch('/api/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });
      const data = await resp.json();
      document.getElementById('mensaje').innerText = '';
      mostrarModal(data.mensaje);
      if (!data.exito) {
        document.getElementById('formulario').classList.remove('oculto');
      }
    } catch (err) {
      document.getElementById('mensaje').innerText = '';
      mostrarModal('No se pudo enviar. Probá de nuevo.');
      document.getElementById('formulario').classList.remove('oculto');
    }
  }

  cargarPartido();
</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
