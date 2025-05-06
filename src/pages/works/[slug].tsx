import { CanopyEnvironment } from "@customTypes/canopy";
import FACETS from "@.canopy/facets.json";
import MANIFESTS from "@.canopy/manifests.json";
import { Manifest } from "@iiif/presentation-3";
import { type NavigationItem } from "@src/customTypes/navigation";
import Related from "@components/Related/Related";
import { buildManifestSEO } from "@lib/seo";
import { fetch } from "@iiif/vault-helpers/fetch";
import { getReferencingContent } from "@src/lib/content/reference/server";
import { shuffle } from "lodash";
import LayoutsWork from "@src/components/Layouts/Work";
import { getMarkdownContent } from "@src/lib/contentHelpers";
import CanopyMDXRemote from "@src/components/MDX";
import WorkManifestId from "@src/components/Work/ManifestId";
import WorkMetadata from "@src/components/Work/Metadata";
import WorkTitle from "@src/components/Work/Title";
import WorkSummary from "@src/components/Work/Summary";
import WorkShare from "@src/components/Work/Share";
import WorkScroll from "@src/components/Work/Scroll";
import WorkViewer from "@src/components/Work/Viewer";
import WorkReferencingContent from "@src/components/Work/ReferencingContent";
import WorkRequiredStatement from "@src/components/Work/RequiredStatement";
import WorkLinkingProperty from "@components/Work/LinkingProperty";
import React from "react";

interface WorkProps {
  manifest: Manifest;
  related: any;
  referencingContent: NavigationItem[];
  source: any;
}

export default function WorkPage({
  manifest,
  referencingContent,
  related,
  source,
}: WorkProps) {
  const {
    id,
    homepage,
    label,
    metadata,
    rendering,
    requiredStatement,
    partOf,
    seeAlso,
    summary,
  } = manifest;
  const Work = () => <></>;

  Work.ManifestId = () => <WorkManifestId manifestId={id} />;
  Work.Metadata = () => <WorkMetadata metadata={metadata} />;
  Work.LinkingProperty = (props) => (
    <WorkLinkingProperty
      {...props}
      homepage={homepage}
      partOf={partOf}
      rendering={rendering}
      seeAlso={seeAlso}
    />
  );
  Work.RequiredStatement = () => (
    <WorkRequiredStatement requiredStatement={requiredStatement} />
  );
  Work.Related = () => <Related collections={related} />;
  Work.ReferencingContent = () => (
    <WorkReferencingContent referencingContent={referencingContent} />
  );
  Work.Scroll = (props) => <WorkScroll {...props} iiifContent={id} />;
  Work.Share = (props) => <WorkShare {...props} iiifContent={id} />;
  Work.Summary = (props) => <WorkSummary {...props} summary={summary} />;
  Work.Title = (props) => <WorkTitle {...props} label={label} />;
  Work.Viewer = (props) => <WorkViewer {...props} iiifContent={id} />;

  return (
    <LayoutsWork>
      <CanopyMDXRemote source={source} customComponents={{ Work }} />
    </LayoutsWork>
  );
}

export async function getStaticProps({ params }: { params: any }) {
  const { url, basePath } = process.env
      ?.CANOPY_CONFIG as unknown as CanopyEnvironment;
  const baseUrl = basePath ? `${url}${basePath}` : url;

  const manifestEntry = MANIFESTS.find((item) => item.slug === params.slug);

  // ❌ Bail out early if no manifest matches the slug
  if (!manifestEntry) {
    console.warn(`🚫 Manifest not found for slug: ${params.slug}`);
    return { notFound: true };
  }

  const { id, index } = manifestEntry;

  let manifest: Manifest;
  try {
    manifest = (await fetch(id)) as Manifest;
  } catch (err) {
    console.error(`❌ Failed to fetch manifest "${id}" for slug "${params.slug}":`, err.message);
    return { notFound: true }; // Prevent build crash
  }

  let referencingContent = [];
  let frontMatter = {};
  let source = {};

  try {
    referencingContent = await getReferencingContent({
      manifestId: manifest.id,
      srcDir: ["content"],
    });

    const content = await getMarkdownContent({
      slug: "_layout",
      directory: "works",
    });

    frontMatter = content.frontMatter;
    source = content.source;
  } catch (err) {
    console.warn(`⚠️ Failed to load markdown content for slug "${params.slug}":`, err.message);
  }

  const seo = await buildManifestSEO(manifest, `/works/${params.slug}`);

  const related = FACETS.map((facet) => {
    const value = shuffle(
        facet.values.filter((entry) => entry.docs.includes(index))
    );
    return `${baseUrl}/api/facet/${facet.slug}/${value[0]?.slug}.json?sort=random`;
  });

  delete manifest.provider;

  return {
    props: {
      manifest,
      related,
      seo,
      referencingContent,
      source,
      frontMatter,
    },
  };
}
export async function getStaticPaths() {
  const paths = MANIFESTS.map((item) => ({
    params: { ...item },
  }));

  return {
    paths: paths,
    fallback: false,
  };
}
