import NavShellClient from "./NavShellClient.client";

const NavShell = () => {
  const siteMode = process.env.NEXT_PUBLIC_SITE_MODE ?? "maintenance";
  const isFull = siteMode === "full";

  return <NavShellClient isFull={isFull} />;
};

export default NavShell;
