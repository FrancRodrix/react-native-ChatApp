import { StyleSheet, Text, View, ScrollView, Pressable } from "react-native";
import React, { useState, useContext, useEffect } from "react";
import { UserType } from "../UserContext";
import { useNavigation } from "@react-navigation/native";
import UserChat from "../components/UserChat";

const ChatsScreen = () => {
  const navigation = useNavigation();
  const { userId, setUserId } = useContext(UserType);

  const [acceptedFriends, setAcceptedFriends] = useState([]);

  useEffect(() => {
    const acceptedFriendsList = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/accepted-friends/${userId}`
        );
        const data = await response.json();

        if (response.ok) {
          setAcceptedFriends(data);
        }
      } catch (err) {
        console.log("Error showing accepted Friends", err);
      }
    };
    acceptedFriendsList();
  }, []);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Pressable>
        {acceptedFriends.map((item, index) => (
          <UserChat key={index} item={item} />
        ))}
      </Pressable>
    </ScrollView>
  );
};

export default ChatsScreen;

const styles = StyleSheet.create({});
