---
name: Fulgor Burger
description: Una sola hamburguesa, por tandas; cupos reales que se ven moverse.
colors:
  mustard: "#f5b82e"
  mustard-hover: "#ffc94a"
  mustard-deep: "#dfa216"
  coffee: "#3b2218"
  coffee-hover: "#4d2e21"
  coffee-ink: "#fff8ee"
  room: "#1c0f09"
  room-2: "#28160e"
  room-3: "#3b2218"
  ember: "#5e3d29"
  ember-line: "#8a6a52"
  cream: "#f7ecdf"
  cream-dim: "#cfbba6"
  alert: "#ffae9c"
  paper: "#f8f7f5"
  panel: "#ffffff"
  line: "#e8e3de"
  line-strong: "#d3cbc3"
  ink: "#20150f"
  ink-soft: "#6a5d54"
  tint: "#f2eee9"
  ok: "#23704a"
  ok-tint: "#e3f2e9"
  warn: "#8a5300"
  warn-tint: "#fdf0d3"
  danger: "#b3261e"
  danger-tint: "#fbe5e3"
  info: "#2f5d8a"
  info-tint: "#e4eef8"
typography:
  display:
    fontFamily: "Rubik, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2.9rem, 9.5vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 6vw, 4rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.035em"
  ticket-code:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 10vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.01em"
    fontFeature: "tnum"
  price:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  title:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: "-0.02em"
  lead:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 2.2vw, 1.6rem)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body-lg:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  body:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  panel-title:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: "-0.02em"
  panel-body:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  panel-meta:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  pill: "999px"
  ticket: "2rem"
  card: "1.75rem"
  card-sm: "1.5rem"
  sticker: "1.25rem"
  field: "1rem"
  thumb: "0.75rem"
  panel: "1rem"
  control: "0.5rem"
spacing:
  gutter: "1rem"
  gutter-sm: "2rem"
  card-pad: "1.25rem"
  card-pad-sm: "1.5rem"
  ticket-pad: "2rem"
  stack: "2.5rem"
  section: "7rem"
  section-lg: "10rem"
  container: "1320px"
  container-panel: "1180px"
  sidebar: "248px"
components:
  button-primary:
    backgroundColor: "{colors.mustard}"
    textColor: "{colors.coffee}"
    rounded: "{rounded.pill}"
    typography: "{typography.label}"
    padding: "0 2rem"
    height: "3.5rem"
  button-primary-hover:
    backgroundColor: "{colors.mustard-hover}"
    textColor: "{colors.coffee}"
  button-primary-disabled:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.cream-dim}"
  button-ghost-room:
    backgroundColor: "{colors.room-2}"
    textColor: "{colors.cream}"
    rounded: "{rounded.pill}"
    padding: "0 1.75rem"
    height: "3.5rem"
  button-ghost-room-hover:
    backgroundColor: "{colors.room-3}"
  button-panel-primary:
    backgroundColor: "{colors.coffee}"
    textColor: "{colors.coffee-ink}"
    rounded: "{rounded.control}"
    padding: "0 1rem"
    height: "2.5rem"
  button-panel-primary-hover:
    backgroundColor: "{colors.coffee-hover}"
  button-panel-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 1rem"
    height: "2.5rem"
  input-room:
    backgroundColor: "{colors.room}"
    textColor: "{colors.cream}"
    rounded: "{rounded.field}"
    padding: "0 1rem"
    height: "3.5rem"
  input-panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 0.75rem"
    height: "2.5rem"
  card-room:
    backgroundColor: "{colors.room-2}"
    textColor: "{colors.cream}"
    rounded: "{rounded.card}"
    padding: "1.5rem"
  slot-option:
    backgroundColor: "{colors.room-2}"
    textColor: "{colors.cream}"
    rounded: "{rounded.field}"
    padding: "1rem 1.25rem"
    height: "4.5rem"
  slot-option-selected:
    backgroundColor: "{colors.room-3}"
    textColor: "{colors.cream}"
  ticket:
    backgroundColor: "{colors.mustard}"
    textColor: "{colors.coffee}"
    rounded: "{rounded.ticket}"
    padding: "2.5rem 2rem 2rem"
  panel-card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  status-pill:
    rounded: "{rounded.pill}"
    typography: "{typography.panel-meta}"
    padding: "0 0.625rem"
    height: "1.5rem"
---

# Design System: Fulgor Burger

## Overview

**Creative North Star: "La sala a media luz"**

Fulgor significa brillo, y el sistema lo toma literal: la página pública es una sala café casi negra donde solo se enciende lo que importa ahora mismo. La hamburguesa del logo, los cupos que quedan, el precio y la acción principal llevan mostaza; todo lo demás es tinta crema sobre café. No hay fotografía genérica, ni tarjetas de menú, ni testimonios: una sola hamburguesa, por tanda, con el número exacto a la vista.

El mundo es plano y redondeado. Superficies tonales en lugar de sombras, botones píldora, tarjetas con esquinas generosas (28px) que hacen eco de las terminales del wordmark FULGOR. La tipografía es una sola familia, Rubik, trabajada en dos extremos: titulares en peso 800 con interlineado apretado y tracking negativo, texto corrido en 400 con aire. El movimiento es escaso y honesto: los dígitos giran solo cuando el servidor reporta un cambio real, el destello del logo titila de vez en cuando, y la confirmación aterriza como una comanda sellada.

El panel administrativo (Operate) es el mismo mundo con la luz encendida: papel cálido, tinta café, la misma Rubik y la misma tira de destellos, pero más denso, con controles de 40px y esquinas de 8px. El café del logo pasa a ser el color de acción; la mostaza queda para los cupos.

**Key Characteristics:**
- Sala café profunda (room) con tinta crema; mostaza solo para lo encendido.
- Una familia (Rubik), extremos de peso 800 / 400, cifras tabulares en todo número que cambia.
- Plano: cero sombras, cero degradados; profundidad por pasos tonales room → room-2 → room-3.
- Píldoras y esquinas grandes en lo público; esquinas de 8px y bordes de 1px en el panel.
- Elementos propios: la tira de cupos con destellos del logo, el contador de dígitos que gira y la comanda mostaza con el sticker como sello.

## Colors

Dos colores de identidad sacados del logo oficial (mostaza y café) y una escala de pasos derivados del café para la sala; el panel usa neutros cálidos claros y cuatro pares de estado.

### Primary
- **Mostaza Fulgor** (mustard): lo encendido. Botón principal, precio, cupos disponibles en la tira de destellos, "Quedan N de M", wordmark de cabecera, anillo de foco y selección de texto sobre la sala, y el fondo de la comanda de confirmación. Su versión de hover (mustard-hover) solo aparece en el botón principal con puntero.
- **Mostaza tostada** (mustard-deep): la mostaza sobre papel. Cupos disponibles en la tira de destellos del panel, donde la mostaza pura pierde contraste con el blanco.

### Secondary
- **Café del logo** (coffee): tinta sobre mostaza (texto del botón principal y de la comanda), color de acción del panel (botón primario, anillo de foco, caret) y valor de room-3. Su hover (coffee-hover) y su tinta clara (coffee-ink) solo existen en el botón café del panel.

### Neutral (sala pública)
- **Sala** (room): fondo del documento, de los campos de texto y de las opciones deshabilitadas; también `theme-color` del navegador.
- **Sala 2** (room-2): superficie de primer nivel. Tarjeta de cupo del héroe, resumen y total del formulario, filas de cantidad, opciones de día sin elegir, botón fantasma.
- **Sala 3** (room-3): superficie elevada por tono. Opción de día elegida, hover del botón fantasma, botones +/− de cantidad, aviso de recarga y banda de contacto a sangre.
- **Brasa** (ember): lo apagado. Destellos de cupos ya tomados, fondo del botón principal deshabilitado, barra vacía cuando la tanda supera 40, subrayado de "Cómo funciona", pulgar del scrollbar.
- **Línea de brasa** (ember-line): borde de 2px de campos y opciones de día; cumple 3:1 contra room y room-2 (WCAG 1.4.11). Subrayado de enlaces secundarios.
- **Crema** (cream): texto principal y titulares.
- **Crema apagada** (cream-dim): texto secundario, descripciones, horarios, la segunda línea del h1 ("20 por domingo") y placeholders (al 80%).
- **Alerta** (alert): errores de formulario sobre la sala; contraste mayor a 7:1. Texto y borde de campo inválido.

### Neutral (panel)
- **Papel** (paper): fondo del panel. **Panel** (panel): tarjetas y campos. **Línea** (line) y **línea fuerte** (line-strong): bordes de 1px de tarjetas, divisores y campos; line-strong también es el destello apagado de la tira en el panel. **Tinta** (ink) y **tinta suave** (ink-soft): texto principal y secundario. **Matiz** (tint): fila activa de navegación, hover, pastilla neutral y barra vacía de cupos.
- **Estados**: ok / ok-tint, warn / warn-tint, danger / danger-tint, info / info-tint. Siempre en pareja texto oscuro sobre tinte claro, dentro de pastillas de 24px de alto.

### Named Rules
**The Lo Encendido Rule.** La mostaza solo marca lo que está vivo o es la acción: la hamburguesa, los cupos disponibles, el precio, el botón principal, el enlace "Agendar" y la comanda. Nunca como fondo de sección, nunca en texto corrido, nunca en iconos decorativos. Si algo mostaza no es accionable ni un dato vivo, está mal.

**The Una Mostaza Grande Rule.** Por pantalla hay como máximo una superficie mostaza grande: el botón principal en el flujo, o la comanda en la confirmación. La comanda reemplaza al botón como protagonista; el botón de WhatsApp que le sigue es secundario en jerarquía aunque sea mostaza.

**The Apagado No Es Gris Rule.** Lo no disponible baja a brasa (ember) o a crema apagada, nunca a gris neutro ni a opacidad sobre la mostaza. Agotado se dice en crema, con palabras, no con color.

## Typography

**Display Font:** Rubik (con ui-sans-serif, system-ui, -apple-system, Segoe UI)
**Body Font:** Rubik (misma familia, cargada como fuente variable con next/font)

**Character:** Una sola sans redondeada que en 800 hace eco del wordmark FULGOR (pesado, terminales suaves) y en 400 se lee tranquila en el teléfono. El contraste viene del peso y del tracking, no de una segunda familia.

### Hierarchy
- **Display** (800, clamp(2.9rem, 9.5vw, 6rem), 0.9, -0.04em): solo el h1 del héroe con el nombre del producto. Su segunda línea, la regla de la tanda, va a 0.62em en crema apagada.
- **Headline** (800, clamp(2.25rem, 6vw, 4rem), 0.95, -0.035em): títulos de sección ("Agenda tu pedido", "Cómo funciona", "Preguntas", contacto).
- **Ticket code** (800, clamp(2.25rem, 10vw, 4.5rem), 1, +0.01em, tabular): el código impreso de la comanda. Único texto grande con tracking positivo: es una cifra para dictar, no un titular.
- **Price** (700, clamp(2rem, 5vw, 2.5rem), 1, -0.02em, tabular, mostaza): precio del héroe.
- **Title** (700, 1.5rem, -0.02em): leyendas de cada paso del formulario y total del pedido.
- **Lead** (700, clamp(1.25rem, 2.2vw, 1.6rem), 1.25, -0.02em): pasos de "Cómo funciona" y preguntas.
- **Body large** (400, 1.125rem, 1.625): descripciones y respuestas, máximo 40–44ch.
- **Body** (400, 1rem, 1.5) y **Label** (600, 1rem): etiquetas de campo, títulos de tarjeta de cupo.
- **Panel** (700 a 1.5rem para el título de página; 15px para texto y navegación; 13px en 500 para pastillas, ayudas y metadatos).

### Named Rules
**The Cifra Quieta Rule.** Todo número que puede cambiar en pantalla (cupos, precios, totales, horas, cantidades, códigos) lleva cifras tabulares, para que no baile al actualizarse.

**The Sin Mayúsculas Rule.** El sistema no usa versales ni tracking ancho en etiquetas; la jerarquía se hace con peso y tamaño. El único espaciado amplio es el BURGER del logo, que es arte, no tipografía.

## Layout

Contenedor de 1320px con margen de 16px en móvil y 32px desde 640px. Rejilla de 12 columnas desde 1024px: el héroe parte 6/6 (texto a la izquierda, hamburguesa a la derecha; en móvil la hamburguesa va arriba a ~44vw, máximo 200px); el flujo de pedido parte 5/7 con la columna del producto fija (sticky, top 40px) mientras avanzan los pasos; las secciones informativas ponen el título en 5 columnas y el contenido desde la columna 7.

Ritmo vertical amplio: 112px entre secciones en móvil y 160px en escritorio; 40px entre pasos del formulario; tarjetas con 20px de padding en móvil y 24px desde 640px. La banda de contacto es la única franja a sangre (room-3). Objetivos táctiles de 44px como mínimo (botones del flujo a 56px).

El panel usa una barra lateral de 248px desde 1024px y, debajo, una barra superior fija con navegación horizontal desplazable; contenido a 1180px con 24–40px de padding.

## Elevation & Depth

Sistema plano. No hay una sola sombra ni degradado en el build. La profundidad se construye por pasos tonales: room (fondo) → room-2 (tarjeta) → room-3 (elegido / elevado). En el panel, por borde de 1px (line) sobre papel. La única "elevación" es física y momentánea: el sticker de la comanda sobresale del borde superior, girado 9°.

### Named Rules
**The Tono Antes Que Sombra Rule.** Para separar una superficie, sube un paso en la escala room; nunca agregues box-shadow. Lo elegido se marca con borde mostaza de 2px más room-3, no con sombra.

## Shapes

Lenguaje redondeado heredado del wordmark. Acciones en píldora (999px). Tarjetas de la sala a 28px; la tarjeta fija del flujo a 24px; la comanda y la foto de producto a 32px; campos, opciones de día y filas de cantidad a 16px; miniaturas a 12px; el sticker a 20px. Bordes de 2px en controles sobre la sala; nada de líneas finas en la superficie pública. En el panel el registro baja: 8px en botones, campos y navegación, 16px en tarjetas, bordes de 1px.

La forma propia es el destello de cuatro puntas del logo: es el indicador de radio de la tira de cupos y el titileo del héroe.

## Components

### Buttons
- **Shape:** píldora (999px), mínimo 48px de alto; en el flujo público 56px con texto de 1.125rem.
- **Primary (mostaza):** mostaza con texto café, 600. Hover solo con puntero (mustard-hover). Deshabilitado baja a brasa con crema apagada.
- **Ghost (sala):** room-2 con texto crema; hover a room-3. Para acciones secundarias ("Hacer otro pedido") y los botones +/− (44px, sobre room-3).
- **Press:** escala a 0.97 en 160ms con ease-out-strong; color en 200ms.
- **Panel:** café con tinta clara (40px, radio 8px, 600 a 14px); secundario blanco con borde line-strong; peligro blanco con borde rosado y texto danger; discreto sin fondo. Misma escala 0.97 al presionar.

### Chips (pastillas de estado, panel)
- **Style:** 24px de alto, radio píldora, 13px en 500, texto de estado sobre su tinte. Cancelado va tachado en matiz.

### Cards / Containers
- **Corner Style:** 28px (sala), 16px (panel).
- **Background:** room-2 en la sala; panel blanco con borde line en el panel.
- **Shadow Strategy:** ninguna (ver Elevation & Depth).
- **Internal Padding:** 20px → 24px en la sala; 20px horizontales y 16px verticales en cabeceras del panel.

### Inputs / Fields
- **Style (sala):** 56px de alto, radio 16px, borde de 2px ember-line sobre room, texto crema a 1.125rem; etiqueta en 600 arriba.
- **Focus:** el borde pasa a mostaza (sin anillo extra). Hover a crema apagada.
- **Error:** borde y mensaje en alert.
- **Panel:** 40px, radio 8px, borde 1px line-strong, 15px; foco con borde café y anillo café de 2px; error en danger.

### Opción de día (radio de tarjeta)
Tarjeta de 72px mínimo, radio 16px, borde de 2px. Sin elegir: room-2 con borde ember-line. Elegida: room-3 con borde mostaza y círculo mostaza con check café. Deshabilitada: room con borde room-2 y texto apagado. A la derecha, el cupo en mostaza tabular ("9 cupos") o el estado en palabras.

### Navigation
Cabecera de 68px: wordmark mostaza a la izquierda; enlaces en crema apagada que pasan a crema; "Agendar" siempre visible, en mostaza 600 con subrayado mostaza al 40% que se completa en hover. Enlace de salto al contenido en píldora mostaza. Panel: filas de 40px, 15px, activa en matiz con 600 e icono de trazo más grueso.

### Tira de cupos (CupoMarks)
La tanda a la vista: un destello del logo por cada hamburguesa, en filas de 10 (20 = dos filas, nunca 17 + 3). Encendido (mostaza en la sala, mostaza tostada en el panel) = disponible; apagado (brasa o line-strong) y reducido a 0.78 = ya tiene dueño. Tamaño fluido clamp(14px, 4.2vw, 26px), versión pequeña de 14px en tablas del panel. Las marcas cambian de color, escala y opacidad en 500ms con ease-out-strong. Por encima de 40 cupos se convierte en una barra de 12px con relleno que anima su ancho en 700ms. Es decorativa para lectores de pantalla: el número exacto siempre va en texto al lado, en una región aria-live.

### Contador de dígitos (RollingNumber)
Cada dígito es una ventana de 1.2em × 0.62em que recorta una cinta 0–9 generada por CSS; al cambiar el valor la cinta se desplaza en 700ms con ease-out-strong, como un tablero de salidas. Solo gira cuando el servidor reporta un cambio real de cupos, nunca por efecto de entrada. El número real va en texto sr-only; la cinta no se copia ni se lee. Con movimiento reducido, cambia sin transición.

### Comanda de confirmación
El pedido confirmado llega como un ticket mostaza a pantalla completa de la columna: radio 32px, texto café, titular en 800, el código impreso en la escala ticket-code y los datos de entrega y total en un dl de dos columnas. El sticker oficial del logo (icono negativo, 80px en móvil / 96px desde 640px, radio 20px) se pega en la esquina superior derecha, girado 9° y sobresaliendo del borde: es el sello. Entra con ticket-in (560ms): sube 24px, gira desde -2.5° y escala desde 0.97 hasta asentarse. Debajo, en crema apagada, cómo seguirá el contacto y las acciones.

## Do's and Don'ts

### Do:
- **Do** reservar la mostaza para lo encendido: la hamburguesa, los cupos disponibles, el precio, la acción principal y la comanda.
- **Do** separar superficies subiendo un paso tonal (room → room-2 → room-3) en vez de sombrear.
- **Do** usar cifras tabulares en todo número que pueda cambiar.
- **Do** mostrar el cupo con la tira de destellos y, siempre al lado, el número exacto en texto ("Quedan 9 de 20").
- **Do** mover dígitos solo cuando cambia el dato del servidor; el movimiento es una noticia, no una decoración.
- **Do** usar ease-out-strong (cubic-bezier(0.23, 1, 0.32, 1)) para entradas y respuestas, y presionar botones a scale(0.97) en 160ms.
- **Do** desactivar animaciones con prefers-reduced-motion: el titileo se detiene, los dígitos cambian sin giro.
- **Do** usar bordes de 2px ember-line en controles sobre la sala para cumplir 3:1.

### Don't:
- **Don't** usar box-shadow ni degradados en ninguna superficie.
- **Don't** pintar fondos de sección, texto corrido o iconos decorativos en mostaza.
- **Don't** presentar la ilustración del logo como fotografía del producto; la foto real solo llega desde el panel.
- **Don't** animar cupos al cargar ni inventar urgencia con contadores; si el servidor no cambió, nada gira.
- **Don't** usar versales ni tracking ancho en etiquetas.
- **Don't** usar líneas de 1px en la superficie pública; los bordes allí son de 2px o no existen.
- **Don't** introducir una segunda familia tipográfica; el contraste sale del peso de Rubik.
