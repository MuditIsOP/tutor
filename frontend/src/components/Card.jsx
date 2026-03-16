function Card({ title, subtitle, children, className = "" }) {
  return (
    <section className={`glass-panel p-6 ${className}`}>
      {title ? <h3 className="text-base font-semibold text-ink">{title}</h3> : null}
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      <div className={title || subtitle ? "mt-5" : ""}>{children}</div>
    </section>
  );
}

export default Card;
