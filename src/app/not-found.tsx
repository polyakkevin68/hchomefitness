import Link from "next/link";

export default function NotFound() {
  return <main className="not-found"><p className="eyebrow">404 — NEM TALÁLHATÓ</p><h1>Ez az oldal most nincs itt.</h1><Link className="primary-button" href="/">Vissza a főoldalra ↗</Link></main>;
}
