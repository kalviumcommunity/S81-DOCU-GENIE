import { SignIn, SignUp, UserButton, useUser } from "@clerk/clerk-react";

export default function AuthPage() {
  const { isSignedIn, user } = useUser(); // Get user info

  return (
    <div>
      {!isSignedIn ? (
        <>
          <h2>Please Sign In</h2>
          <SignIn />
          <SignUp />
        </>
      ) : (
        <>
          <h2>Welcome, {user?.firstName}!</h2>
          <UserButton />
        </>
      )}
    </div>
  );
}