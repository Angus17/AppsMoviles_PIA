# Guía rápida: Ejecutar el proyecto en modo desarrollo

Sigue estos pasos después de clonar el repositorio desde GitHub.

## 1. Instalar dependencias

Ejecuta en la raíz del proyecto:

```bash
npm install
```

Esto descargará todos los `node_modules` definidos en `package.json`.

## 2. Iniciar el servidor de desarrollo (Metro / Expo)

Usa el modo túnel (útil para dispositivos en redes distintas) y limpia la caché:

```bash
npx expo start --tunnel -c
```

Nota: En algunos ejemplos aparece `--tunel`; la bandera correcta es `--tunnel`.

## 3. Cambiar a modo Expo Go (solo si estás en Development Build)

Si el servidor muestra que estás en un "Development build" y quieres usar la app estándar de Expo Go, presiona la tecla:

```
s
```

Esto forzará el servidor a ofrecer el bundle compatible con Expo Go.

## 4. Abrir la aplicación en el dispositivo

Tienes varias opciones:

- Escanear el código QR que aparece en la terminal o página web del dev server.
- Abrir manualmente el enlace en Expo Go usando el formato:

```
exp://<link>.exp.direct
```

Donde `<link>` será el identificador que Expo genere (lo verás en la terminal). Asegúrate de que el dispositivo móvil y tu PC tengan conexión a Internet estable.

## 5. (Opcional) Uso con Android Emulator / iOS Simulator

- Android: abre un emulador y luego en la terminal presiona `a`.
- iOS (macOS): presiona `i` para abrir el simulador.

## 6. Solución de problemas rápida

| Situación | Acción sugerida |
|-----------|-----------------|
| Errores extraños de paquetes | Ejecuta `rm -rf node_modules package-lock.json` y luego `npm install` |
| Cambios que no se reflejan | Presiona `r` para recargar; `shift + r` para reiniciar completamente |
| Dispositivo no conecta en LAN | Usa `--tunnel` o verifica que ambos estén en la misma red |
| Caché corrupta | Agrega `-c` (ya incluido) o cierra y reinicia Expo |

## 7. Scripts útiles

Si necesitas resetear el proyecto, revisa el script en `scripts/reset-project.js` (ejecútalo bajo tu propio criterio).

## 8. Requisitos previos mínimos

- Node.js (versión recomendada LTS)
- npm
- Expo CLI (se instala automáticamente al usar `npx expo`)
- App Expo Go instalada en tu dispositivo (Google Play / App Store)

---
¡Listo! Con esto deberías poder ver la app en tu dispositivo o emulador.
