

# 📄 README.md — **CronChat Frontend**

# CronChat Frontend

🚀 **CronChat Frontend** is a web client for the CronChat system, responsible for user interaction, realtime updates, and state synchronization with backend services.

The frontend consumes REST APIs and WebSocket events in a structured way, focusing on responsiveness, predictable UI state, and maintainable component design.


## Overview

CronChat Frontend provides the user-facing interface for:

- Authentication and session handling
- Room and message presentation
- Realtime message updates
- User interactions such as reactions, replies, and media uploads

The application emphasizes component isolation and clear data flow.


## Technology Stack

- **Framework**: React
- **Build Tool**: Vite
- **Language**: JavaScript (ES6+)
- **Styling**: CSS (custom, component-scoped)
- **Realtime**: WebSocket
- **HTTP Client**: Fetch API


## Features

### Authentication & Session
- Login flow using JWT-based authentication
- Client-side access token handling

### Chat UI
- Direct and group chat interfaces
- Realtime message updates
- Emoji reactions and message replies
- Read / unread indicators
- Auto-scroll and message grouping

### Room & User
- Realtime room list updates
- User list and search
- User avatar display and upload

### Media
- Client-side image compression before upload
- Image preview and grid layout in chat
...
