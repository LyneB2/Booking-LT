import Link from "next/link";
export default function Home() {
  return (
    <div className="welcome">
      <p className="eyebrow">A place for every part of your stay</p>
      <h1>
        Your complex.
        <br />A little more connected.
      </h1>
      <p className="lead">
        A shared workspace for the people who make a complex feel like home.
      </p>
      <Link className="button" href="/sign-in">
        Sign in to your workspace <span aria-hidden="true">↗</span>
      </Link>
    </div>
  );
}
