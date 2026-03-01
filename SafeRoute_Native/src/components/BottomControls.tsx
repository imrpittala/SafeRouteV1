import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useAppStore } from '../store/useAppStore';

export const BottomControls = () => {
    const { activeRoute, setActiveRoute } = useAppStore();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Navigation Mode</Text>
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, activeRoute === 'fastest' && styles.activeButtonFast]}
                    onPress={() => setActiveRoute('fastest')}
                >
                    <Text style={[styles.buttonText, activeRoute === 'fastest' && styles.activeText]}>
                        Fastest Route
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, activeRoute === 'safest' && styles.activeButtonSafe]}
                    onPress={() => setActiveRoute('safest')}
                >
                    <Text style={[styles.buttonText, activeRoute === 'safest' && styles.activeText]}>
                        Safest Route
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
        textAlign: 'center',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        marginHorizontal: 5,
        borderRadius: 10,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
    },
    activeButtonFast: {
        backgroundColor: '#2196F3', // Blue
    },
    activeButtonSafe: {
        backgroundColor: '#4CAF50', // Green
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    activeText: {
        color: '#FFF',
    },
});
