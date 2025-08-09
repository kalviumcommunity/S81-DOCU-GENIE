import { SignedIn, SignedOut } from "@clerk/clerk-react";

function Dashboard() {
  return (
    <div>
      <SignedIn>
        <h2>Welcome to the Dashboard!</h2>
      </SignedIn>
      <SignedOut>
        <h2>You need to sign in to access this page.</h2>
      </SignedOut>
    </div>
  );
}

export default Dashboard;