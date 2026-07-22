import memberApi from "../api/memberApi";
import type {
  CreateMemberRequest,
  UpdateMemberRequest,
} from "../types/Member";

export const memberService = {
  getAll: () => memberApi.getAll(),

  getById: (id: string) => memberApi.getById(id),

  create: (request: CreateMemberRequest) =>
    memberApi.create(request),

  update: (id: string, request: UpdateMemberRequest) =>
    memberApi.update(id, request),

  delete: (id: string) =>
    memberApi.delete(id),
};