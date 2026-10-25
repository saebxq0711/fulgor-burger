---
version: 1
slug: "src-app-public-page-tsx"
primary_target: "src/app/(public)/page.tsx"
related_targets: []
---

# Página pública de pedidos — Fulgor Burger

Scope: página pública `/` (héroe + flujo de agendado + cómo funciona + preguntas + contacto) y sus páginas hermanas `/privacidad`, `/contacto`.
Visitor mode: Persuade con un flujo Operate embebido (el pedido).
Audiencia: personas en Colombia, en el teléfono, que llegan desde un enlace de WhatsApp. Acción: agendar hamburguesas para un día de entrega.

## Direction contract

THESIS: Fulgor significa brillo. La página es una sala café oscura donde lo único encendido es la hamburguesa y el cupo que queda. Rechaza la landing de restaurante por defecto: foto genérica a sangre, tarjetas de menú, testimonios.

OWN-WORLD: Fondo café profundo derivado de #3B2218 (más oscuro para la sala, el café del logo para superficies). Tinta crema cálida para texto. Mostaza #F5B82E reservada a lo encendido: la hamburguesa, los cupos vivos, la acción principal. Wordmark real del logo. Display con terminales redondeadas y peso alto que hace eco del wordmark; texto en una sans sobria. Botones pill, sin sombras en reposo, sin degradados, sin líneas finas.

STORY: El visitante entiende en un vistazo qué es (una hamburguesa, por tanda), cuánto cuesta, para qué día y cuántas quedan de verdad; elige día, cantidad, deja nombre y WhatsApp, ve el resumen y confirma. Cree que el cupo es real porque lo ve moverse.

FIRST VIEWPORT: Barra simple: wordmark mostaza a la izquierda, enlace "Agendar" a la derecha. Centro-izquierda: h1 grande con nombre del producto y la regla de la tanda; precio en COP en mostaza; una frase de descripción. Derecha (en móvil, arriba): la hamburguesa encendida a ~45% del ancho. Debajo: la fila de cupos del próximo día (marcas encendidas = disponibles, apagadas = tomadas) con el número exacto y la hora de cierre. Acción principal "Agendar la mía" visible sin scroll en 390px.

FORM: Fusión del candidato 4 de mi lista anclada (la bolsa kraft sellada con el sticker del logo: la confirmación es un sello/comanda) con la dirección "dark room" de Taste (seed 24695601). Seed Impeccable 875b57f1. Préstamo declarado del retador split-flap: el estado vivo honesto — los números de cupo cambian con un giro de dígito cuando el servidor reporta un cambio, nunca por efecto.

SIGNATURE: la fila de cupos viva (sondeo corto + revalidación al abrir el checkout y antes de confirmar), y la columna del producto fija (pinned) mientras avanzan los pasos del pedido en escritorio.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
