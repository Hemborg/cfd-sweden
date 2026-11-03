"use client";

import { useState } from "react";
import { libraryContent, resourceFacets, resourceItems } from "@/content/site";

export function ResourceLibrary() {
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState("");
  const [collection, setCollection] = useState("");
  const topics = [...new Set(resourceItems.map((item) => item.type))];
  const formats = [...new Set(Object.values(resourceFacets).map((item) => item.format))];
  const collections = [...new Set(Object.values(resourceFacets).map((item) => item.collection))];
  const visible = resourceItems.filter((item) =>
    (!topic || item.type === topic) &&
    (!format || resourceFacets[item.title]?.format === format) &&
    (!collection || resourceFacets[item.title]?.collection === collection),
  );
  return <>
    <div className="filter-strip" role="group" aria-label={libraryContent.title}>
      {["", ...topics].map((value) => (
        <button className={topic === value ? "selected" : undefined} type="button"
          aria-pressed={topic === value} onClick={() => setTopic(value)} key={value}>
          {value || libraryContent.allTopics}
        </button>
      ))}
      <label className="filter-select">{libraryContent.allFormats}
        <select aria-label={libraryContent.allFormats} value={format} onChange={(event) => setFormat(event.target.value)}>
          <option value="">{libraryContent.allFormats}</option>
          {formats.map((value) => <option key={value}>{value}</option>)}
        </select>
      </label>
      <label className="filter-select">{libraryContent.allCollections}
        <select aria-label={libraryContent.allCollections} value={collection} onChange={(event) => setCollection(event.target.value)}>
          <option value="">{libraryContent.allCollections}</option>
          {collections.map((value) => <option key={value}>{value}</option>)}
        </select>
      </label>
    </div>
    <div className="resource-grid" aria-live="polite">
      {visible.length === 0 && <p>{libraryContent.empty}</p>}
      {visible.map((resource) => <article className="resource-card" key={resource.title}>
        <p className="subpage-eyebrow">{resource.type}</p>
        <h2>{resource.title}</h2><p>{resource.text}</p>
      </article>)}
    </div>
  </>;
}
