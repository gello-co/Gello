import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type Item,
  createItem,
  deleteItem,
  getItemById,
  getItemsByUser,
  getAllItems,
  updateItem,
  createUserItemAssociation,
  deleteUserItemAssociation
} from "../db/items.db.js";
import type { CreateItemInput, CreateUserItemAssociationInput, DeleteUserItemAssociationInput, UpdateItemInput } from "../schemas/item.js";

export class ItemService {
  private client: SupabaseClient;
  constructor(client: SupabaseClient) {
    this.client = client;
  } 
  
  async getItem(id: string): Promise<Item | null> {
      return getItemById(this.client, id);
    }
  
  async getItemsByUser(userId: string): Promise<Item[]> {
     return getItemsByUser(this.client, userId);
  }
  
  async createItem(input: CreateItemInput): Promise<Item> {
    return createItem(this.client, input);
  }

  async updateItem(input: UpdateItemInput): Promise<Item> {
    return updateItem(this.client, input);
  }

  async deleteItem(id: string): Promise<void> {
    return deleteItem(this.client, id);
  }

  async getAllItems(): Promise<Item[]> {
    return getAllItems(this.client);
  }

  async createUserItemAssociation(input: CreateUserItemAssociationInput): Promise<void> {
    return createUserItemAssociation(this.client, input.user_id, input.item_id);
  }
  
  async deleteUserItemAssociation(input: DeleteUserItemAssociationInput): Promise<void> {
    return deleteUserItemAssociation(this.client, input.user_id, input.item_id);
  }
}