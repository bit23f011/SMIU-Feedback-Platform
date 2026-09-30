import * as React from "react";

import { getFilterOptions } from "@/features/discovery/queries";
import { FilterControls, FilterControlsSkeleton } from "@/features/discovery/filter-controls";
import {
  COURSE_FILTER_FIELDS,
  PEOPLE_FILTER_FIELDS,
  type FilterField,
} from "@/features/discovery/filter-fields";

/*
  DirectoryFilterBar - server side wrapper.

  Options (departments, courses, semesters, programs) server par parhe jate hain,
  is liye browser ko poora catalogue bhejne ki zaroorat nahi parti (README §84).
  `getFilterOptions()` cached hai, to ek request me ek hi baar chalti hai chahe
  do jagah use ho.

  Agar reference data load na ho sake to controls phir bhi render hote hain, bas
  dropdowns khali (aur disabled) rehte hain. Filter bar toot jane se poora
  directory nahi rukna chahiye.
*/

export async function DirectoryFilterBar({
  fields,
  showTeacherType = false,
  className,
}: {
  fields?: readonly FilterField[];
  /** Teacher type sirf parhane walon par maani rakhta hai. */
  showTeacherType?: boolean;
  className?: string;
}) {
  const options = await getFilterOptions();

  const resolved =
    fields ??
    (showTeacherType
      ? PEOPLE_FILTER_FIELDS
      : PEOPLE_FILTER_FIELDS.filter((field) => field !== "teacherType"));

  return <FilterControls options={options} fields={resolved} className={className} />;
}

export { COURSE_FILTER_FIELDS, FilterControlsSkeleton, PEOPLE_FILTER_FIELDS };
