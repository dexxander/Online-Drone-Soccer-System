/**
 * PLACEHOLDER: Data Fetching Abstraction (MatchService)
 * 
 * WHAT THIS FILE CHANGES:
 * Decouples the UI from Firestore, allowing the app to fetch match data from the local Express API instead.
 * 
 * TODO FOR THE TEAM:
 * 1. Define an interface `IMatchProvider` (getMatches, updateScore, addPenalty).
 * 2. Implement `LocalApiProvider` that makes `fetch()` or `axios` calls to the local Express backend (e.g., `/api/matches`).
 * 3. Keep the existing Firebase logic inside a `FirestoreProvider` for future use.
 * 4. Export `MatchService` that routes to the correct provider based on environment variables.
 */
