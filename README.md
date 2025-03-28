# VueMafia - Online Mafia Game

A real-time online Mafia game built with Vue.js, Firebase, and Socket.io.

## Features

- Real-time gameplay with WebSocket communication
- Google Authentication
- Multiple game roles (Mafia, Doctor, Detective, Civilians)
- Live chat system
- Beautiful UI with Tailwind CSS
- Responsive design

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- Socket.io server

## Setup

1. Clone the repository:
```bash
git clone https://github.com/RahimjonovBoburjon/Online-Mafia-Game.git
cd vue-mafia-game
```

2. Install dependencies:
```bash
npm install
```

3. Create a Firebase project and enable:
   - Authentication (Google sign-in)
   - Firestore Database
   - Copy your Firebase configuration

4. Update Firebase configuration:
   - Open `src/services/firebase.js`
   - Replace the placeholder values with your Firebase config

5. Start the development server:
```bash
npm run dev
```

## Game Rules

1. The game starts with 5+ players
2. Each player gets a random role:
   - Mafia (1-2 players): Eliminates one player each night
   - Doctor (1 player): Can save one player per night
   - Detective (1 player): Can check if a player is mafia
   - Civilians: Work together to find and vote out the mafia

3. Game Phases:
   - Night Phase: Mafia, doctor, and detective perform their actions
   - Day Phase: Players discuss and vote on whom to eliminate

4. Win Conditions:
   - Civilians win if they eliminate all mafia members
   - Mafia wins if they outnumber the civilians

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
