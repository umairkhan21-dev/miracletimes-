import Link from "next/link";

export function EmptyState({
  title,
  message,
  action,
  heading = "h2",
}: {
  title: string;
  message: string;
  action?: { href: string; label: string };
  heading?: "h1" | "h2";
}) {
  const Title = heading;
  return (
    <div className="empty">
      <Title>{title}</Title>
      <p>{message}</p>
      {action ? (
        <Link className="btn btn-red" href={action.href}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
