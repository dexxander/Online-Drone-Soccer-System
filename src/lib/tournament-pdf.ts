import type { Team, Tournament } from "./types";

function safe(value: string) { return value.replace(/[^\x20-\x7E]/g, "?"); }
function escapePdf(value: string) { return safe(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"); }

function buildPdf(pages: string[][]) {
  const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [] /Count 0 >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  const pageIds: number[] = [];
  pages.forEach((lines) => {
    const content = ["BT", "/F1 11 Tf", "48 752 Td", "14 TL", ...lines.map((line, index) => `${index ? "T* " : ""}(${escapePdf(line)}) Tj`), "ET"].join("\n");
    const contentId = objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    pageIds.push(objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`));
  });
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets[index + 1] = pdf.length; pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function downloadPdf(fileName: string, pages: string[][]) {
  const url = URL.createObjectURL(buildPdf(pages));
  const link = document.createElement("a"); link.href = url; link.download = fileName; link.click(); URL.revokeObjectURL(url);
}
function teamName(id: string | null, teams: Team[]) { return id ? teams.find((team) => team.id === id)?.name ?? "Unknown team" : "TBD"; }
function groupLines(tournament: Tournament, teams: Team[]) {
  const groups = new Map<number, Set<string>>();
  tournament.matches.filter((match) => match.phase === "group").forEach((match) => {
    const ids = groups.get(match.groupNumber ?? 1) ?? new Set<string>();
    if (match.teamAId) ids.add(match.teamAId); if (match.teamBId) ids.add(match.teamBId); groups.set(match.groupNumber ?? 1, ids);
  });
  return [...groups.entries()].flatMap(([number, ids]) => [`Group ${String.fromCharCode(64 + number)} (${ids.size} teams)`, ...[...ids].map((id) => `  - ${teamName(id, teams)}`), ""]);
}
function bracketLines(tournament: Tournament, teams: Team[]) {
  const matches = tournament.matches.filter((match) => (match.phase ?? "knockout") === "knockout");
  return matches.length ? matches.sort((a, b) => a.round - b.round || a.slot - b.slot).map((match) => `Round ${match.round}, Match ${match.slot + 1}: ${teamName(match.teamAId, teams)} vs ${teamName(match.teamBId, teams)}${match.winnerId ? ` | Winner: ${teamName(match.winnerId, teams)}` : ""}`) : ["Knockout bracket is waiting for group results."];
}
function page(title: string, tournament: Tournament, lines: string[]) { return [`${title}: ${tournament.name}`, `Generated ${new Date().toLocaleString()}`, "", ...lines]; }
function pages(title: string, tournament: Tournament, lines: string[]) {
  const allLines = page(title, tournament, lines);
  return Array.from({ length: Math.max(1, Math.ceil(allLines.length / 48)) }, (_, index) => allLines.slice(index * 48, index * 48 + 48));
}
export function exportGroupStagePdf(tournament: Tournament, teams: Team[]) { downloadPdf(`${tournament.name}-group-stage.pdf`, pages("Group Stage", tournament, groupLines(tournament, teams))); }
export function exportBracketPdf(tournament: Tournament, teams: Team[]) { downloadPdf(`${tournament.name}-bracket.pdf`, pages("Tournament Bracket", tournament, bracketLines(tournament, teams))); }
export function exportTournamentPdf(tournament: Tournament, teams: Team[]) { downloadPdf(`${tournament.name}-tournament.pdf`, pages("Tournament Summary", tournament, [`Status: ${tournament.status}`, `Teams: ${tournament.teamIds.length}`, "", "GROUP STAGE", ...groupLines(tournament, teams), "KNOCKOUT BRACKET", ...bracketLines(tournament, teams)])); }
