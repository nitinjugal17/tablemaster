'use server';

import type { User, AccountStatus, UserRole as AppUserRoleType } from '@/lib/types';
import { getUsers, saveUsers } from './data-management-actions';
import { connectToDatabase, toObjectId } from '@/lib/mongodb';


export async function updateUserDetails(
  userId: string,
  updates: Partial<Pick<User, 'name' | 'email' | 'role' | 'phone' | 'accountStatus' | 'loyaltyPoints'>>
): Promise<{ success: boolean; message: string }> {
  console.log(`[User Action] Attempting to update details for user ID: ${userId} with updates:`, JSON.stringify(updates));
  const dataSource = process.env.DATA_SOURCE || 'csv';

  if (dataSource === 'mongodb') {
    try {
      const { db } = await connectToDatabase();
      const usersCollection = db.collection('users');
      const userObjectId = toObjectId(userId);

      const userToUpdate = await usersCollection.findOne({ _id: userObjectId });
      if (!userToUpdate) {
        return { success: false, message: `User with ID ${userId} not found.` };
      }

      if (updates.role && updates.role !== userToUpdate.role && updates.role === 'superadmin') {
         await usersCollection.updateMany(
            { role: 'superadmin', _id: { $ne: userObjectId } },
            { $set: { role: 'admin' } }
         );
         console.log(`[User Action] Demoted other superadmins before promoting ${userId}.`);
      } else if (updates.role && updates.role !== userToUpdate.role && userToUpdate.role === 'superadmin') {
         const superadminCount = await usersCollection.countDocuments({ role: 'superadmin' });
         if (superadminCount <= 1) {
            console.warn(`[User Action] Prevented demotion of the only superadmin (${userId}).`);
            return { success: false, message: "Cannot demote the only superadmin. Assign another user as superadmin first." };
         }
      }
      
      const updatePayload: any = { ...updates };
      if (updates.loyaltyPoints !== undefined) {
        updatePayload.loyaltyPoints = Number(updates.loyaltyPoints) || 0;
      }


      const result = await usersCollection.updateOne(
        { _id: userObjectId },
        { $set: updatePayload }
      );
      
      if (result.modifiedCount > 0) {
        return { success: true, message: `User ${updates.name || userToUpdate.name} updated successfully.` };
      }
      return { success: false, message: 'No changes were made to the user.' };

    } catch (error) {
       console.error(`[User Action] Error updating user details in MongoDB for ${userId}:`, error);
       return { success: false, message: `An unexpected server error occurred: ${(error as Error).message}` };
    }
  }

  // --- CSV Fallback Logic ---
  try {
    let users = await getUsers(); 
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      console.error(`[User Action] User with ID ${userId} not found for update.`);
      return { success: false, message: `User with ID ${userId} not found.` };
    }

    const originalUser = { ...users[userIndex] }; 
    let updatedUser = { ...originalUser, ...updates };
    
    if (updates.loyaltyPoints !== undefined) {
      updatedUser.loyaltyPoints = Number(updates.loyaltyPoints) || 0;
    }

    if (updates.role && updates.role !== originalUser.role) {
      if (updates.role === 'superadmin') {
        users = users.map(u => u.role === 'superadmin' && u.id !== userId ? { ...u, role: 'admin' as AppUserRoleType } : u);
        const potentiallyNewUserIndex = users.findIndex(u => u.id === userId);
        if (potentiallyNewUserIndex !== -1) {
            updatedUser = { ...users[potentiallyNewUserIndex], ...updates, role: 'superadmin' as AppUserRoleType };
            users[potentiallyNewUserIndex] = updatedUser;
        } else {
            console.error(`[User Action] Critical error: User ${userId} lost after superadmin demotion mapping.`);
            return { success: false, message: "Critical error during role update." };
        }

      } else if (originalUser.role === 'superadmin' && updates.role !== 'superadmin') {
        const superadminCount = users.filter(u => u.role === 'superadmin').length;
        if (superadminCount === 1) {
          console.warn(`[User Action] Prevented demotion of the only superadmin (${userId}).`);
          return { success: false, message: "Cannot demote the only superadmin. Assign another user as superadmin first." };
        }
        updatedUser.role = updates.role as AppUserRoleType;
      } else {
         updatedUser.role = updates.role as AppUserRoleType;
      }
    }
    
    const finalUserIndex = users.findIndex(u => u.id === userId);
    if (finalUserIndex !== -1) {
        users[finalUserIndex] = { ...users[finalUserIndex], ...updatedUser };
    } else {
        const userToUpdate = users.find(u => u.id === userId);
        if(userToUpdate){
            Object.assign(userToUpdate, updatedUser);
        } else {
            return { success: false, message: `User ${userId} state lost during update processing.`};
        }
    }

    const saveResult = await saveUsers(users);

    if (saveResult.success) {
      return { success: true, message: `User ${updatedUser.name || userId} updated successfully.` };
    } else {
      return { success: false, message: `Failed to save updated user data: ${saveResult.message}` };
    }
  } catch (error) {
    console.error(`[User Action] Error updating user details for ${userId}:`, error);
    return { success: false, message: `An unexpected error occurred: ${(error as Error).message}` };
  }
}

export async function updateUserRole(userId: string, newRole: User['role']): Promise<{ success: boolean; message: string }> {
  console.log(`[User Action] Attempting to update role for user ID: ${userId} to ${newRole} via dedicated action.`);
  return updateUserDetails(userId, { role: newRole as AppUserRoleType });
}
