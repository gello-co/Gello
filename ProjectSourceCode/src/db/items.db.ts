import type { SupabaseClient } from "@supabase/supabase-js";
import { ValidationError } from "../errors/ValidationError.js";

export type Item = {
    id: string;
    name: string;
    points: number;
};

export type CreateItemInput = {
    name: string;
    points: number;
};

export type UpdateItemInput = {
    id: string;
    name?: string;
    points?: number;
};

export type UserItemAssociation = {
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
