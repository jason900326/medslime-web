// Compatibility shim: the classifier historically imports this module path.
// v1.3 is a strict superset of the accepted v1.2 catalog, so forwarding here
// lets the remaining queue use the final catalog without duplicating logic.
export {
  getAllowedSubtopics,
  getAllowedTaxonomy,
  getTaxonomySubjectKey,
  type TaxonomySubjectKey,
} from "@/lib/topic-taxonomy-v1-3";
