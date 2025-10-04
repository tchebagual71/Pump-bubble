# Pump-bubble: Solana-based Telegram Investment DAO

## Overview
A multiplayer investment DAO for Telegram groups, powered by Solana. Members deposit USDC into a Squads multisig wallet via Anchor contracts, receive shares, promote trades (realms), and execute via Jupyter aggregator. Access is token-gated using Grape Protocol.

## Structure
- `/bot` — Node.js/TypeScript grammY Telegram bot
- `/anchor` — Rust/Anchor Solana programs
- `/scripts` — CLI scripts for multisig and governance
- `/db` — Postgres database schema and migrations
- `/jupyter` — Jupyter notebooks for trade aggregation/execution

## Features
- USDC deposits and share issuance
- Multisig wallet and governance
- Trade proposal and execution
- Token-gated access (Grape Protocol)

## Getting Started
Each subfolder contains its own README and setup instructions.