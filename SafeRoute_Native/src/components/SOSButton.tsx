import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Text, Vibration, Alert, View } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const SOS_QUEUE_KEY = '@sos_queue';
// UPDATED: Pointing to your computer's local network IP address
const BACKEND_URL = 'http://192.168.50.17:8000/api/alerts/sos';

export const SOSButton = () => {
    const { isSOSActive, triggerSOS, cancelSOS } = useAppStore();
    const [countdown, setCountdown] = useState<number | null>(null);

    // Method to process any queued SOS alerts from AsyncStorage when offline
    const processQueue = async () => {
        try {
            const queueStr = await AsyncStorage.getItem(SOS_QUEUE_KEY);
            if (queueStr) {
                const queue = JSON.parse(queueStr);
                if (queue.length > 0) {
                    console.log(`Network restored! Attempting to sync ${queue.length} offline SOS alerts...`);
                    // Create an array of HTTP post promises for all cached alerts
                    const reqs = queue.map((payload: any) => axios.post(BACKEND_URL, payload));
                    await Promise.allSettled(reqs);
                    // Clear the queue after attempting synchronization
                    await AsyncStorage.removeItem(SOS_QUEUE_KEY);
                    console.log("Offline SOS queue synced and cleared successfully.");
                }
            }
        } catch (error) {
            console.error("Error processing offline SOS queue:", error);
        }
    };

    // Set up a listener to detect when network connection is restored
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            if (state.isConnected && state.isInternetReachable !== false) {
                // Device came back online, sync the queue!
                processQueue();
            }
        });

        // Initial queue process check on mount
        NetInfo.fetch().then(state => {
            if (state.isConnected) processQueue();
        });

        // Cleanup the listener on component unmount
        return () => unsubscribe();
    }, []);

    // Core SOS trigger logic handling online vs offline routing
    const sendSOSAlert = async () => {
        // Construct the standard payload
        const payload = {
            userId: "user-123", // Example userId
            location: { lat: 12.9716, lng: 77.5946 }, // Example coordinates
            timestamp: new Date().toISOString(),
            type: "SOS"
        };

        try {
            const state = await NetInfo.fetch();
            if (state.isConnected) {
                // Online: Try sending directly to backend
                await axios.post(BACKEND_URL, payload);
                console.log("SOS Alert dispatched directly to the server!");
            } else {
                // Offline: Throw error to fall into catch block and queue
                throw new Error("Device is offline");
            }
        } catch (error) {
            // Either the POST failed (e.g. server down) or the device was offline. Cache the alert.
            console.log("Failed to send SOS immediately. Saving to offline queue...", error);
            try {
                const queueStr = await AsyncStorage.getItem(SOS_QUEUE_KEY);
                const queue = queueStr ? JSON.parse(queueStr) : [];
                queue.push(payload);
                await AsyncStorage.setItem(SOS_QUEUE_KEY, JSON.stringify(queue));
                console.log("SOS securely cached offline.");
            } catch (storageError) {
                console.error("Critical Failure: Could not save to Offline Queue", storageError);
            }
        }
    };

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (countdown !== null && countdown > 0) {
            timer = setTimeout(() => {
                setCountdown(countdown - 1);
                Vibration.vibrate(200); // Vibrate on each tick
            }, 1000);
        } else if (countdown === 0) {
            // Countdown finished! Trigger the actual backend alerting process.
            Vibration.vibrate(1000); // Long vibrate
            Alert.alert(
                "SOS Triggered",
                "Emergency Contacts and Data Centers Notified.",
                [{ text: "OK", onPress: cancelSOS }]
            );
            setCountdown(null);

            // Send the network request
            sendSOSAlert();
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [countdown, cancelSOS]);

    const handlePress = () => {
        if (!isSOSActive && countdown === null) {
            triggerSOS();
            setCountdown(3);
            Vibration.vibrate(200);
        }
    };

    const handleCancel = () => {
        cancelSOS();
        setCountdown(null);
    };

    if (countdown !== null) {
        return (
            <View style={styles.countdownContainer}>
                <Text style={styles.countdownText}>SOS in {countdown}...</Text>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                    <Text style={styles.cancelText}>CANCEL</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <TouchableOpacity style={styles.sosButton} onPress={handlePress} activeOpacity={0.8}>
            <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    sosButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FF0000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 100,
    },
    sosText: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 1,
    },
    countdownContainer: {
        position: 'absolute',
        top: 60,
        right: 20,
        backgroundColor: 'rgba(255, 59, 48, 0.9)',
        borderRadius: 20,
        padding: 15,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
        zIndex: 100,
    },
    countdownText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    cancelButton: {
        backgroundColor: '#FFF',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 15,
    },
    cancelText: {
        color: '#FF3B30',
        fontWeight: 'bold',
    },
});