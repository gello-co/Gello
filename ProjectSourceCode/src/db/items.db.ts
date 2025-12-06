import type { SupabaseClient } from "@supabase/supabase-js";
import { ValidationError } from "../errors/ValidationError.js";

//TODO  handle errors like other files

export type Item = {
    id: string;
    name: string;
    points: number;
    image_url?: string;
};

export type CreateItemInput = {
    name: string;
    points: number;
    image_url?: string;
};

export type UpdateItemInput = {
    id: string;
    name?: string;
    points?: number;
    image_url?: string;
};

export type UserItemAssociation = {
    user_id: string;
    item_id: string;
};

export type CreateUserItemAssociationInput = {
    user_id: string;
    item_id: string;
};

export type DeleteUserItemAssociationInput = {
    user_id: string;
    item_id: string;
};

export async function createItem(
    client: SupabaseClient,
    input: CreateItemInput,
): Promise<Item> {
    const { data, error } = await client
        .from("items")
        .insert(input)
        .select("*")
        .single();
    if (error) {
        throw new Error(`Failed to create item: ${error.message}`);
    }
    
    return data as Item;
}

export async function updateItem(
    client: SupabaseClient,
    input: UpdateItemInput,
): Promise<Item> {
    const { id, ...updates } = input;
    
    const { data, error } = await client
        .from("items")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();
    if (error) {
        throw new Error(`Failed to update item: ${error.message}`);
    }
    
    return data as Item;
}

export async function deleteItem(
    client: SupabaseClient,
    id: string,
): Promise<void> {
    const { error } = await client
        .from("items")
        .delete()
        .eq("id", id);
    if (error) {
        throw new Error(`Failed to delete item: ${error.message}`);
    }
}

export async function getItemById(
    client: SupabaseClient,
    id: string,
): Promise<Item | null> {
    const { data, error } = await client
        .from("items")
        .select("*")
        .eq("id", id)
        .single();
    if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw new Error(`Failed to get item: ${error.message}`);
    }
    
    return data as Item;
}

export async function getAllItems(
    client: SupabaseClient,
): Promise<Item[]> {
    const { data, error } = await client
        .from("items")
        .select("*")
        .order("name", { ascending: true });
    if (error) {
        throw new Error(`Failed to get items: ${error.message}`);
    }
    return (data ?? []) as Item[];
}

//TODO: Join with item table
export async function getItemsByUser(
    client: SupabaseClient,
    userId: string,
): Promise<Item[]> {
    const { data, error } = await client
        .from("user_to_items")
        .select("items(*)")
        .eq("user_id", userId);
    if (error) {
        throw new Error(`Failed to get items for user: ${error.message}`);
    }
    return (data?.map((row: any) => row.items) ?? []) as Item[];
}

export async function createUserItemAssociation(
    client: SupabaseClient,
    userId: string,
    itemId: string,
): Promise<void> {
    const { error } = await client
        .from("user_to_items")
        .insert({ user_id: userId, item_id: itemId });
    if (error) {
        throw new Error(`Failed to associate item with user: ${error.message}`);
    }
}

export async function deleteUserItemAssociation(
    client: SupabaseClient,
    userId: string,
    itemId: string,
): Promise<void> {
    const { error } = await client
        .from("user_to_items")
        .delete()
        .eq("user_id", userId)
        .eq("item_id", itemId);
    if (error) {
        throw new Error(`Failed to delete association between user and item: ${error.message}`);
    }
}

//TODO: Delete association when item is deleted