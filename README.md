# Discord Vouch Bot

Bot de vouches/reseñas para servidor de Discord.

## Configuración

1. Instalar dependencias:
```bash
npm install
```

2. Configurar el archivo `.env` con tus credenciales:
   - DISCORD_TOKEN: Token del bot
   - CLIENT_ID: ID de la aplicación del bot
   - GUILD_ID: Ya configurado (1128489481935274054)
   - VOUCH_CHANNEL_ID: ID del canal donde se publicarán los vouches

3. Crear el bot en Discord Developer Portal:
   - https://discord.com/developers/applications
   - Bot → Reset Token → Copiar token al .env
   - OAuth2 → Client ID → Copiar al .env

4. Invitar el bot al servidor con permisos de:
   - Send Messages
   - Embed Links
   - Use Slash Commands

5. Iniciar el bot:
```bash
npm start
```

6. Comandos disponibles:
   - `/setup-vouch` - Crear panel informativo de vouches
   - `/vouch user:@usuario rating:5 review:"texto"` - Dejar un vouch
   - `/vouches user:@usuario` - Ver total de vouches de un usuario

## Características

- ⭐ Sistema de rating de 1-5 estrellas
- 💬 Reviews/testimonios detallados
- 📊 Contador de vouches por usuario
- 🎨 Embeds con colores según rating (verde=excelente, amarillo=bueno, rojo=bajo)
- 🔒 Previene auto-vouches
- ✅ Validación de longitud mínima de review
- 📢 Publicación automática en canal de vouches
- 🎯 Color mint (#00D9A3) consistente
