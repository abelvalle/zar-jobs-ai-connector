# Skills Radar

Skills Radar compara entre 2 y 20 ofertas que el usuario ya tiene con un CV validado. Su resultado explica qué competencias aparecen en esa muestra y cuáles tienen evidencia visible en el CV.

## Contrato

- Cada oferta necesita identificador, título, empresa y descripción.
- El vocabulario integrado cubre términos profesionales y técnicos frecuentes; `skillTerms` permite añadir términos concretos.
- Cada competencia incluye recuento, proporción, ofertas de origen, estado y rutas de evidencia.
- `supported` significa que existe coincidencia literal en el CV.
- `unverified-gap` significa únicamente que no se encontró esa coincidencia; puede existir experiencia aún no documentada.

## Interpretación segura

La frecuencia describe solo la muestra aportada. No demuestra demanda de mercado, causalidad ni probabilidad de contratación. Antes de tratar una laguna como aprendizaje pendiente hay que preguntar al usuario si posee evidencia real. La herramienta no modifica el CV, no abre ofertas y no almacena los textos.
