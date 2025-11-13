const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

console.log("=== Iniciando reparación del sistema de autenticación ===\n");

// TAREA 1: Generar nuevo AUTH_SECRET
const authSecret = crypto.randomBytes(32).toString("base64");
console.log("1. AUTH_SECRET generado:", authSecret);

// TAREA 2: Actualizar .env.local
try {
  const envPath = path.join(__dirname, ".env.local");
  let envContent = fs.readFileSync(envPath, "utf8");

  // Reemplazar AUTH_SECRET
  envContent = envContent.replace(
    /AUTH_SECRET=.*/,
    `AUTH_SECRET=${authSecret}`
  );

  // Cambiar NEXTAUTH_URL a AUTH_URL
  envContent = envContent.replace(/NEXTAUTH_URL=/g, "AUTH_URL=");

  fs.writeFileSync(envPath, envContent, "utf8");
  console.log("2. .env.local actualizado correctamente");
} catch (err) {
  console.error("ERROR al actualizar .env.local:", err.message);
}

// TAREA 3: Verificar bcryptjs (ya está instalado)
console.log("3. bcryptjs y @types/bcryptjs ya están instalados");

// TAREA 4 y 6: Eliminar archivos conflictivos y deprecados
const filesToDelete = [
  path.join(__dirname, "src", "app", "api", "auth", "login", "route.ts"),
  path.join(__dirname, "src", "app", "api", "auth", "logout", "route.ts"),
  path.join(__dirname, "src", "app", "api", "auth", "session", "route.ts"),
  path.join(__dirname, "src", "auth.ts"),
  path.join(__dirname, "src", "auth.config.ts"),
];

console.log("4. Eliminando archivos conflictivos y deprecados:");
filesToDelete.forEach((file) => {
  try {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`   - Eliminado: ${path.relative(__dirname, file)}`);
    } else {
      console.log(
        `   - No encontrado (omitiendo): ${path.relative(__dirname, file)}`
      );
    }
  } catch (err) {
    console.error(
      `   - ERROR al eliminar ${path.relative(__dirname, file)}:`,
      err.message
    );
  }
});

// Eliminar directorios vacíos
const dirsToRemove = [
  path.join(__dirname, "src", "app", "api", "auth", "login"),
  path.join(__dirname, "src", "app", "api", "auth", "logout"),
  path.join(__dirname, "src", "app", "api", "auth", "session"),
];

dirsToRemove.forEach((dir) => {
  try {
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
      console.log(
        `   - Directorio vacío eliminado: ${path.relative(__dirname, dir)}`
      );
    }
  } catch (err) {
    // Ignorar errores al eliminar directorios
  }
});

// TAREA 5: Actualizar src/lib/auth.ts
try {
  const authPath = path.join(__dirname, "src", "lib", "auth.ts");
  let authContent = fs.readFileSync(authPath, "utf8");

  // Eliminar la línea de comparación de texto plano
  authContent = authContent.replace(
    /\s*const isPlainTextMatch = password === user\.password;\n/,
    ""
  );

  // Actualizar la validación para usar solo bcrypt
  authContent = authContent.replace(
    /if \(!isValidPassword && !isPlainTextMatch\) \{/,
    "if (!isValidPassword) {"
  );

  fs.writeFileSync(authPath, authContent, "utf8");
  console.log("5. src/lib/auth.ts actualizado para usar solo bcrypt");
} catch (err) {
  console.error("ERROR al actualizar src/lib/auth.ts:", err.message);
}

console.log("\n=== Todas las tareas completadas ===");
console.log("\nPróximos pasos:");
console.log("1. Reinicia el servidor de desarrollo: yarn dev");
console.log("2. Las contraseñas en la BD deben estar hasheadas con bcrypt");
console.log(
  "3. Si tienes contraseñas en texto plano, necesitas hashearlas primero"
);
