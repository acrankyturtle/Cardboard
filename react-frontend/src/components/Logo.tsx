import logo from "../assets/key.png";

export function Logo({
  alt,
  ...props
}: Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src">) {
  return <img {...props} src={logo} alt={alt} />;
}
