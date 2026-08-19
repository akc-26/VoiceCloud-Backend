/**
 * Shared Data Transfer Object Contracts
 * Module: @shared/dto
 */

export interface IPaginationQuery {
  page?: number;
  limit?: number;
}

export interface ISortQuery {
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface IFilterQuery {
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface ILoginRequest {
  email: string;
  password?: string;
  authCode?: string;
}

export interface IRegisterRequest {
  username: string;
  email: string;
  password?: string;
}

export interface IRefreshTokenRequest {
  refreshToken: string;
}
