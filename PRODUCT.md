# Product

<!-- impeccable:product-schema 1 -->

> Registro inferido del brief (CLAUDE.md) y de los logos entregados. El usuario pidió trabajar
> de forma autónoma, sin ronda de entrevista. Lo marcado como *(supuesto)* debe confirmarse.

## Platform

web

## Stack

delegated: Next.js (App Router) + TypeScript + Tailwind CSS + Prisma + PostgreSQL. Elegido porque el
repositorio estaba vacío, el entorno tiene Node 24 y Docker, y PostgreSQL permite operaciones atómicas
reales para evitar sobreventa. Despliegue previsto: cualquier host Node (Vercel, Railway, Render, VPS)
con PostgreSQL gestionado.

## Users

- **Clientes**: personas en Colombia que quieren apartar una hamburguesa para el domingo desde el
  teléfono, sin crear cuenta. Llegan casi siempre desde un enlace compartido por WhatsApp o redes.
- **Administrador**: quien cocina y entrega; revisa pedidos, cierra fechas y ajusta cupos, a menudo
  desde el teléfono en plena operación.

## Product Purpose

Vender hamburguesas por cupos limitados por día de entrega. El cliente agenda con nombre y WhatsApp;
el negocio sabe cuántas preparar y a quién contactar. Éxito: cero sobreventa, cupos honestos y un
pedido confirmado en menos de un minuto desde el móvil.

## Positioning

Una sola hamburguesa, hecha por tandas: 20 por domingo *(capacidad inicial configurable)*. La escasez
es real y se muestra tal cual, con el número exacto de cupos restantes.

## Operating Context

- Zona horaria America/Bogota; precios en COP.
- Entregas programadas por día/turno (inicialmente los domingos). El cupo cierra a una hora
  configurable *(supuesto: sábado 20:00)*.
- Contacto con el cliente por WhatsApp, manual. No hay pasarela de pago: el pedido queda agendado y
  el pago se coordina por fuera *(supuesto)*.

## Capabilities and Constraints

- Pedido público sin registro: nombre, WhatsApp, día/turno, producto y cantidad.
- Varios productos posibles a futuro; hoy uno.
- Panel privado con autenticación real para pedidos, productos, fechas, capacidad, marca y textos.
- No se envían mensajes de WhatsApp automáticos; solo enlaces wa.me.
- Sin precio definitivo ni dirección conocidos: el seed usa valores de ejemplo que el administrador
  debe reemplazar.

## Brand Commitments

- Logo real en `public/brand/` (versiones positivo, negativo, una tinta, icono): hamburguesa sonriente
  con un destello, wordmark FULGOR pesado y redondeado, BURGER espaciado.
- Colores del logo: mostaza `#F5B82E` y café `#3B2218`.
- Voz cercana y directa, en español de Colombia; sin urgencia inventada.

## Evidence on Hand

- Logos SVG/PNG (origen: `C:\Users\Sebastian\Pictures\Fulgor Burger`).
- **No hay fotografías del producto.** Toda imagen de hamburguesa es una ilustración provisional y
  debe presentarse como tal hasta que el administrador suba la foto real.
- No hay reseñas, clientes, prensa ni cifras: no se inventan.

## Product Principles

1. Los cupos son la verdad: el número que ve el cliente sale del servidor y nunca se exagera.
2. Pedir es más rápido que preguntar por WhatsApp.
3. Nada de datos de más: solo lo necesario para preparar y contactar.
4. El historial no se borra; cada semana es una fecha nueva.

## Accessibility & Inclusion

WCAG 2.2 AA donde sea viable; prioridad móvil, objetivos táctiles cómodos y movimiento reducido.
