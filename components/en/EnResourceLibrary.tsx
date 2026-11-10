"use client";

import { useState } from "react";
import { libraryContentEn, resourceFacetsEn, resourceItemsEn } from "@/content/site.en";

export function EnResourceLibrary() {
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState("");
  const [collection, setCollection] = useState("");
  const topics = [...new Set(resourceItemsEn.map((item) => item.type))];
  const formats = [...new Set(Object.values(resourceFacetsEn).map((item) => item.format))];
  const collections = [...new Set(Object.values(resourceFacetsEn).map((item) => item.collection))];
  const visible = resourceItemsEn.filter((item) =>
    (!topic || item.type === topic) &&
    (!format || resourceFacetsEn[item.title]?.format === format) &&
    (!collection || resourceFacetsEn[item.title]?.collection === collection),
  );
  return (
    <>
      <div className="filter-strip" role="group" aria-label={libraryContentEn.title}>
        {["", ...topics].map((value) => (
          <button className={topic === value ? "selected" : undefined} type="button"
            aria-pressed={topic === value} onClick={() => setTopic(value)} key={value}>
            {value || libraryContentEn.allTopics}
          </button>
        ))}
        <label className="filter-select">{libraryContentEn.allFormats}
          <select aria-label={libraryContentEn.allFormats} value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="">{libraryContentEn.allFormats}</option>
            {formats.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="filter-select">{libraryContentEn.allCollections}
          <select aria-label={libraryContentEn.allCollections} value={collection} onChange={(e) => setCollection(e.target.value)}>
            <option value="">{libraryContentEn.allCollections}</option>
            {collections.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
      </div>
      <div className="resource-grid" aria-live="polite">
        {visible.length === 0 && <p>{libraryContentEn.empty}</p>}
        {visible.map((resource) => (
          <article className="resource-card" key={resource.title}>
            <p className="subpage-eyebrow">{resource.type}</p>
            <h2>{resource.title}</h2>
            <p>{resource.text}</p>
          </article>
        ))}
      </div>
    </>
  );
}
