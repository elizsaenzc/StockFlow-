import jwt from 'jsonwebtoken';
const CLAVE = process.env.JWT_SECRET || 'stockflow_clave_secreta_2025!';

export function verificarToken(req, res, next) {
  const cabecera = req.headers.authorization;
  if (!cabecera?.startsWith('Bearer '))
    return res.status(401).json({ mensaje: 'Acceso no autorizado' });
  try {
    req.usuario = jwt.verify(cabecera.slice(7), CLAVE);
    next();
  } catch {
    res.status(401).json({ mensaje: 'Token inválido o caducado' });
  }
}

export function requerirRol(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario?.rol))
      return res.status(403).json({ mensaje: 'Sin permisos para esta operación' });
    next();
  };
}

export function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, nombre_usuario: usuario.nombre_usuario, rol: usuario.rol, nombre: usuario.nombre_completo },
    CLAVE,
    { expiresIn: '12h' }
  );
}
