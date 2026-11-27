// Who may open period and pregnancy logs.
// Mother: female head, or female spouse.
// Daughter: a child whose gender is female, including members saved as "girl".

export function inferRelation(member) {
  if (!member) return "";
  if (member.relation === "head" || member.relation === "spouse" || member.relation === "child") {
    return member.relation;
  }
  if (member.gender === "girl" || member.gender === "boy") return "child";
  if (member.role === "head") return "head";
  if (member.role === "member" || member.email) return "spouse";
  return "";
}

export function canViewHealthLogs(member) {
  if (!member) return false;
  const gender = member.gender;
  const relation = inferRelation(member);
  if (gender === "girl") return true;
  if (gender !== "female") return false;
  return relation === "head" || relation === "spouse" || relation === "child";
}
