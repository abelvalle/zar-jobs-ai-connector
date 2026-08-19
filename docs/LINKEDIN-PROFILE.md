# Optimizador manual de perfil LinkedIn

Este flujo prepara texto para que el usuario lo revise y copie manualmente. No lee el perfil activo, no inicia sesión y no publica cambios.

## Flujo

1. `plan_linkedin_profile` valida el CV y devuelve briefs para titular, About y experiencias.
2. Cada brief contiene rutas de evidencia y un presupuesto editorial local.
3. El cliente redacta solo desde esas rutas y, opcionalmente, compara el texto que el usuario haya pegado.
4. `audit_linkedin_profile_draft` señala métricas no respaldadas, términos nuevos y evidencia relacionada.
5. El usuario revisa y copia el resultado por su cuenta.

## Límites

- Los presupuestos de caracteres son orientación del producto, no límites oficiales de LinkedIn.
- Una auditoría sin métricas nuevas no certifica la verdad del borrador.
- No se sugieren ni infieren atributos protegidos.
- No existe acceso al perfil, scraping, OAuth, publicación, mensajería, red ni almacenamiento.
