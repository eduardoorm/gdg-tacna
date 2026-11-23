// Archivo de demo para el code review con Gemini.
// Contiene errores INTENCIONALES para que la IA los detecte en el PR.

export async function login(req, res, db) {
  // 🔒 SQL injection: concatena input del usuario en la consulta
  const q = "SELECT * FROM users WHERE email = '" + req.body.email + "'";
  const user = await db.query(q);

  if (!user) return res.status(401).end();

  // 🔑 Secreto hardcodeado (valor ficticio de demo)
  const token = sign({ id: user.id }, "mi-clave-super-secreta");

  return res.json({ token, password: user.password }); // expone el hash de la contraseña
}

export async function getUsersWithOrders(db, ids) {
  const result = [];
  // 🐢 N+1: una consulta por cada id
  for (const id of ids) {
    const user = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    const orders = await db.query("SELECT * FROM orders WHERE user_id = ?", [id]);
    result.push({ ...user, orders });
  }
  return result;
}
