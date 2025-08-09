import { ClerkLoaded, SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import React from "react";
const App: React.FC = () => {
  return (
    <ClerkLoaded>
      <header className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome to Stylux</h1>

          <SignedOut>
            <SignInButton />
            <p className="text-gray-400 mt-2">Sign in to access your account.</p>
          </SignedOut>

          <SignedIn>
            <UserButton />
            {/* <p className="text-gray-400 mt-2">You're signed in!</p> */}
          </SignedIn>
        </div>
      </header>
    </ClerkLoaded>
  );
};

export default App;
