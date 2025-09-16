# Pump Bubbles

A Next.js 14 TypeScript application that visualizes real-time wallet activity with bouncing balls on a fullscreen canvas.

## Features

- **SSE (Server-Sent Events)**: Polls Dexscreener API every 2.5 seconds
- **Real-time Visualization**: Each wallet gets a bouncing ball
- **Dynamic Sizing**: Ball area proportional to total volume / 1e9
- **Color Coding**: Colors generated from wallet hash
- **Physics**: DVD-style wall bounces with speed nudging on growth
- **Aggregation**: Tracks buys by wallet with delta and total amounts

## File Structure

```
pump-bubbles/
├── app/
│   ├── api/
│   │   └── events/
│   │       └── route.ts          # SSE endpoint with Dexscreener polling
│   ├── globals.css               # Tailwind CSS styles
│   ├── layout.tsx               # Root layout component
│   └── page.tsx                 # Main canvas component with ball physics
├── public/
│   └── .gitkeep
├── .dockerignore
├── .eslintrc.json
├── .gitignore
├── Dockerfile                   # Multi-stage Docker build
├── next-env.d.ts
├── next.config.js
├── package.json
├── postcss.config.js
├── README.md
├── tailwind.config.js
└── tsconfig.json
```

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Production Build

```bash
npm run build
npm start
```

## Docker

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run
```

Or directly:

```bash
docker build -t pump-bubbles .
docker run -p 3000:3000 pump-bubbles
```

## API

The SSE endpoint accepts query parameters:
- `pair`: Dexscreener pair address
- `mint`: Token mint address

Example: `http://localhost:3000/api/events?pair=YOUR_PAIR_ADDRESS`

## Technical Details

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Real-time**: Server-Sent Events (SSE)
- **Animation**: HTML5 Canvas with requestAnimationFrame
- **Physics**: Custom bouncing ball implementation
- **Color Generation**: Deterministic HSL from wallet hash