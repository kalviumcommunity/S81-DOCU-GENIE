import { useUser } from "@clerk/clerk-react";

export default function Profile() {
  const { user } = useUser();

  if (!user) return <p>Loading...</p>;

  return (
    <div>
      <h2>Welcome, {user.fullName}!</h2>
      <p>Email: {user.primaryEmailAddress?.emailAddress || "No email found"}</p>
    </div>
  );
}