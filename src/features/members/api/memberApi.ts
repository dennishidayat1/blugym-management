import api from "../../../api/axios";
import type {
  Member,
  CreateMemberRequest,
  UpdateMemberRequest,
} from "../types/Member";

const memberApi = {
  async getAll(): Promise<Member[]> {
    const { data } = await api.get<Member[]>("/members");
    return data;
  },

  async getById(id: string): Promise<Member> {
    const { data } = await api.get<Member>(`/members/${id}`);
    return data;
  },

  async create(request: CreateMemberRequest): Promise<Member> {
    const { data } = await api.post<Member>("/members", request);
    return data;
  },

  async update(id: string, request: UpdateMemberRequest): Promise<Member> {
    const { data } = await api.put<Member>(`/members/${id}`, request);
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/members/${id}`);
  },
};

export default memberApi;