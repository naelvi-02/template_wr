import { get, set, del } from "idb-keyval";

export interface Project {
  id: string;
  name: string;
  createdAt: number;
}

// We redefine JewelryFile here without the ObjectURLs since they can't be stored in IndexedDB.
export interface StoredJewelryFile {
  id: string;
  baseName: string;
  name: string;
  karat: string;
  mp: string;
  file: File;
  detailFile?: File;
  category: string | null;
  detecting: boolean;
  status: "queued" | "processing" | "done" | "error";
  claspBbox?: { cx: number; cy: number; w: number; h: number } | null;
  resultBlob?: Blob;
  kembarId?: string | null;
}

const PROJECTS_KEY = "wr_projects";

export async function getProjects(): Promise<Project[]> {
  const projects = await get<Project[]>(PROJECTS_KEY);
  return projects || [];
}

export async function createProject(name: string): Promise<Project> {
  const projects = await getProjects();
  const newProject: Project = {
    id: Date.now().toString(),
    name,
    createdAt: Date.now(),
  };
  projects.push(newProject);
  await set(PROJECTS_KEY, projects);
  return newProject;
}

export async function deleteProject(id: string): Promise<void> {
  const projects = await getProjects();
  const filtered = projects.filter((p) => p.id !== id);
  await set(PROJECTS_KEY, filtered);
  await del(`project_files_${id}`); // Delete associated files
}

export async function getProjectFiles(projectId: string): Promise<StoredJewelryFile[]> {
  const files = await get<StoredJewelryFile[]>(`project_files_${projectId}`);
  return files || [];
}

export async function saveProjectFiles(projectId: string, files: StoredJewelryFile[]): Promise<void> {
  await set(`project_files_${projectId}`, files);
}
