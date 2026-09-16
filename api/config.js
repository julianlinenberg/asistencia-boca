const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  try {
    const id = (req.query.id || '').trim();
    if (!id) {
      return res.status(200).json({ existe: false, mensaje: 'Falta el id del partido.' });
    }

    const { data, error } = await supabase
      .from('partidos')
      .select('nombre, estado, cierra_en')
      .eq('id_partido', id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ existe: false, mensaje: 'Error interno: ' + error.message });
    }
    if (!data) {
      return res.status(200).json({ existe: false });
    }

    let estado = (data.estado || '').trim().toLowerCase();

    // Si sigue "abierto" en la tabla pero ya pasó la hora fijada en cierra_en, se considera cerrado
    if (estado === 'abierto' && data.cierra_en && new Date() >= new Date(data.cierra_en)) {
      estado = 'cerrado';
    }

    return res.status(200).json({
      existe: true,
      nombre: data.nombre,
      estado: estado,
      cierra_en: data.cierra_en || null
    });
  } catch (err) {
    return res.status(500).json({ existe: false, mensaje: 'Error interno: ' + err.message });
  }
};
