import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DesignLanguageApp from "../../../DesignLanguageApp.client";
import { componentRegistry } from "../../registry";

type ComponentContractPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return componentRegistry.runtime.map((entry) => ({ id: entry.id }));
}

export async function generateMetadata({ params }: ComponentContractPageProps): Promise<Metadata> {
  const { id } = await params;
  const entry = componentRegistry.runtime.find((item) => item.id === id);
  return {
    title: entry ? `${entry.name} / Component Registry / Design Language` : "Unknown component contract",
    robots: { index: false, follow: false },
  };
}

export default async function ComponentContractPage({ params }: ComponentContractPageProps) {
  const { id } = await params;
  if (!componentRegistry.runtime.some((entry) => entry.id === id)) notFound();
  return <DesignLanguageApp activeRouteId="components" componentDetailId={id} componentsView="detail" />;
}
